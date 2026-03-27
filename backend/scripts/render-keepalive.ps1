param(
  [string]$BackendHealthUrl = "https://freshly-backend-5vmz.onrender.com/health",
  [string]$BackendMlStatusUrl = "https://freshly-backend-5vmz.onrender.com/api/ml/status",
  [string]$MlHealthUrl = "https://freshly-ml.onrender.com/health",
  [int]$IntervalSeconds = 600
)

$ErrorActionPreference = 'Stop'

function Test-Endpoint {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 35
    return "OK $($response.StatusCode)"
  }
  catch {
    return "FAIL $($_.Exception.Message)"
  }
}

Write-Output "[Keepalive] Started at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Output "[Keepalive] Backend health: $BackendHealthUrl"
Write-Output "[Keepalive] Backend ML status: $BackendMlStatusUrl"
Write-Output "[Keepalive] ML health: $MlHealthUrl"
Write-Output "[Keepalive] Interval: $IntervalSeconds seconds"

while ($true) {
  $time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

  $backendStatus = Test-Endpoint -Url $BackendHealthUrl
  $backendMlStatus = Test-Endpoint -Url $BackendMlStatusUrl
  $mlStatus = Test-Endpoint -Url $MlHealthUrl

  Write-Output "[$time] backend=$backendStatus | backend_ml=$backendMlStatus | ml=$mlStatus"

  Start-Sleep -Seconds $IntervalSeconds
}
