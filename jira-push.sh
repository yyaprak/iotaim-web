#!/usr/bin/env bash
set -euo pipefail

SUMMARY="${1:-}"
if [ -z "$SUMMARY" ]; then
  echo "Kullanım: ./jira-push.sh \"Yapılan işin özeti\""
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Yerel .env dosyası varsa ortam değişkenlerini yükle
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
fi

JIRA_URL="${JIRA_URL:-https://iotaim-web.atlassian.net}"
JIRA_PROJECT_KEY="${JIRA_PROJECT_KEY:-KAN}"
JIRA_ISSUE_TYPE="${JIRA_ISSUE_TYPE:-Task}"
JIRA_EMAIL="${JIRA_EMAIL:-}"
JIRA_TOKEN="${JIRA_TOKEN:-}"

if [ -z "$JIRA_EMAIL" ] || [ -z "$JIRA_TOKEN" ]; then
  echo "HATA: JIRA_EMAIL ve JIRA_TOKEN tanımlı olmalıdır (.env dosyasını veya ortam değişkenlerini kontrol edin)."
  exit 1
fi

PAYLOAD="$(
  JIRA_PROJECT_KEY="$JIRA_PROJECT_KEY" \
  JIRA_ISSUE_TYPE="$JIRA_ISSUE_TYPE" \
  SUMMARY="$SUMMARY" \
  python3 -c 'import json, os; print(json.dumps({
    "fields": {
      "project": {"key": os.environ["JIRA_PROJECT_KEY"]},
      "summary": os.environ["SUMMARY"],
      "issuetype": {"name": os.environ["JIRA_ISSUE_TYPE"]},
    }
  }))'
)"

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

HTTP_CODE="$(
  curl -sS -o "$RESPONSE_FILE" -w "%{http_code}" \
    -X POST "$JIRA_URL/rest/api/3/issue" \
    -u "$JIRA_EMAIL:$JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"
)"

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "HATA: Jira kartı oluşturulamadı (HTTP $HTTP_CODE). Yanıt:"
  cat "$RESPONSE_FILE"
  echo
  exit 1
fi

ISSUE_KEY="$(
  python3 -c 'import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get("key", ""))
except Exception:
    print("")' < "$RESPONSE_FILE"
)"

if [ -z "$ISSUE_KEY" ]; then
  echo "HATA: Jira yanıtında issue key bulunamadı:"
  cat "$RESPONSE_FILE"
  echo
  exit 1
fi

echo "Oluşturulan Jira Kartı: $ISSUE_KEY ($SUMMARY)"

if grep -rnE --exclude-dir=.git --exclude='.env' --exclude='.env.*' 'ATATT[0-9A-Za-z_-]{20,}' "$SCRIPT_DIR" >/dev/null 2>&1; then
  echo "HATA: Repo içinde açık Atlassian API token tespit edildi. git push güvenlik nedeniyle durduruldu."
  exit 1
fi

git add .
git commit --allow-empty -m "$ISSUE_KEY: $SUMMARY"
git push
