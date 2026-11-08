#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Rolling deployment of a new image tag to both tiers (called by CI/CD).
#
#  1. Remember the tag currently live (for rollback).
#  2. Write the new tag to the SSM parameter that instances read at boot.
#  3. Start an Auto Scaling instance refresh on the app and web tiers: new
#     instances launch with the new images; old ones are drained only after
#     the new ones pass load balancer health checks (>= 50% always serving).
#  4. Smoke test through the public load balancer: the API must report the
#     new version and the front end must answer.
#  5. On any failure: restore the previous tag and refresh again (rollback).
#
# Required env: AWS_REGION, IMAGE_TAG, APP_URL (not needed on the bootstrap run).
# Optional: PROJECT.
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT="${PROJECT:-occasionhub}"
: "${AWS_REGION:?}" "${IMAGE_TAG:?}"
export AWS_DEFAULT_REGION="$AWS_REGION"

PARAM="/$PROJECT/image-tag"
ASGS=("$PROJECT-app-asg" "$PROJECT-web-asg")
ERR=$(mktemp)

PREVIOUS=$(aws ssm get-parameter --name "$PARAM" --query Parameter.Value --output text)
echo "live tag: $PREVIOUS  ->  new tag: $IMAGE_TAG"

publish_tag() {
  aws ssm put-parameter --name "$PARAM" --value "$1" --type String --overwrite >/dev/null
}

# First run (bootstrap): images are pushed before `terraform apply` has
# created the Auto Scaling Groups. Publish the tag and stop.
found=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "${ASGS[@]}" \
          --query 'length(AutoScalingGroups)' --output text)
if [ "$found" != "${#ASGS[@]}" ]; then
  publish_tag "$IMAGE_TAG"
  echo "::notice::Auto Scaling Groups not created yet. Image tag $IMAGE_TAG published; now run 'terraform apply'."
  exit 0
fi

start_refresh() { # prints the refresh id; waits if one is already running (e.g. started by terraform)
  local asg=$1
  for _ in $(seq 1 60); do
    if aws autoscaling start-instance-refresh --auto-scaling-group-name "$asg" \
         --preferences '{"MinHealthyPercentage":50,"InstanceWarmup":120}' \
         --query InstanceRefreshId --output text 2>"$ERR"; then
      return 0
    fi
    grep -q "InstanceRefreshInProgress" "$ERR" || { cat "$ERR" >&2; return 1; }
    echo "a refresh is already running on $asg, waiting..." >&2
    sleep 20
  done
  return 1
}

wait_refresh() { # up to 30 minutes
  local asg=$1 id=$2 status pct
  for _ in $(seq 1 90); do
    read -r status pct < <(aws autoscaling describe-instance-refreshes \
      --auto-scaling-group-name "$asg" --instance-refresh-ids "$id" \
      --query 'InstanceRefreshes[0].[Status,PercentageComplete]' --output text)
    echo "$asg: $status (${pct}% complete)"
    case "$status" in
      Successful) return 0 ;;
      Failed | Cancelled | RollbackSuccessful | RollbackFailed) return 1 ;;
    esac
    sleep 20
  done
  return 1
}

rollback() {
  echo "::error::Deployment of $IMAGE_TAG failed. Rolling back to $PREVIOUS."
  publish_tag "$PREVIOUS"
  for asg in "${ASGS[@]}"; do
    aws autoscaling cancel-instance-refresh --auto-scaling-group-name "$asg" >/dev/null 2>&1 || true
  done
  for asg in "${ASGS[@]}"; do
    id=$(start_refresh "$asg") && echo "rollback refresh $id started on $asg" || true
  done
  exit 1
}

: "${APP_URL:?set the APP_URL repository variable (terraform output app_url)}"
publish_tag "$IMAGE_TAG"

declare -A IDS
for asg in "${ASGS[@]}"; do
  IDS[$asg]=$(start_refresh "$asg") || rollback
  echo "instance refresh ${IDS[$asg]} started on $asg"
done

for asg in "${ASGS[@]}"; do
  wait_refresh "$asg" "${IDS[$asg]}" || rollback
done

echo "smoke test via $APP_URL"
for _ in $(seq 1 30); do
  live=$(curl -fsS --max-time 10 "$APP_URL/backend/health" | jq -r '.version' 2>/dev/null || true)
  if [ "$live" = "$IMAGE_TAG" ]; then
    curl -fsS --max-time 10 -o /dev/null "$APP_URL/"
    curl -fsS --max-time 10 "$APP_URL/backend/venues?limit=1" | jq -e '.venues' >/dev/null
    echo "deployment successful: version $live is live"
    exit 0
  fi
  echo "waiting for version $IMAGE_TAG (load balancer answered '${live:-nothing}')"
  sleep 10
done
rollback
