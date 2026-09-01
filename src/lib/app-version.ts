import packageJson from "../../package.json";

export function getAppVersion() {
  const deploymentId = process.env.NEXT_PUBLIC_APP_VERSION
    ?? process.env.VERCEL_GIT_COMMIT_SHA
    ?? process.env.GITHUB_SHA;

  return deploymentId
    ? `${packageJson.version}+${deploymentId.slice(0, 12)}`
    : packageJson.version;
}
