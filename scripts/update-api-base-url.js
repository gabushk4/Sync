const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function getLocalIp() {
  try {
    const route = execFileSync("ip", ["-4", "route", "get", "1.1.1.1"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const routeIp = route.match(/\bsrc\s+(\d{1,3}(?:\.\d{1,3}){3})\b/);
    if (routeIp) return routeIp[1];
  } catch {}

  const addresses = Object.entries(os.networkInterfaces()).flatMap(
    ([name, interfaces]) =>
      (interfaces || [])
        .filter(
          (network) =>
            network.family === "IPv4" &&
            !network.internal &&
            !network.address.startsWith("169.254.")
        )
        .map((network) => ({ name, address: network.address }))
  );

  addresses.sort((a, b) => {
    const preferred = /^(en|eth|wl)/i;
    return Number(preferred.test(b.name)) - Number(preferred.test(a.name));
  });

  if (addresses[0]) return addresses[0].address;
  throw new Error("Aucune adresse IPv4 locale n'a été trouvée.");
}

const envPath = path.resolve(__dirname, "../../sync_api/.env");
if (!fs.existsSync(envPath)) {
  throw new Error(`Fichier API introuvable : ${envPath}`);
}

const envText = fs.readFileSync(envPath, "utf8");
const baseUrlLines = envText.match(/^[ \t]*BASE_URL[ \t]*=/gm) || [];
if (baseUrlLines.length !== 1) {
  throw new Error(`Une seule clé BASE_URL est attendue dans ${envPath}.`);
}

const localIp = getLocalIp();
let updated = false;
const updatedEnv = envText.replace(
  /^([ \t]*BASE_URL[ \t]*=[ \t]*)(.*?)(\r?)$/m,
  (line, prefix, rawValue, lineEnding) => {
    const value = rawValue.trim();
    const quote = value.match(/^(["'])(.*)\1$/);
    const currentBaseUrl = quote ? quote[2] : value;
    let url;

    try {
      url = new URL(currentBaseUrl);
    } catch {
      throw new Error(`La valeur de BASE_URL n'est pas une URL valide dans ${envPath}.`);
    }

    url.hostname = localIp;
    let nextBaseUrl = url.toString();
    if (url.pathname === "/" && !url.search && !url.hash) {
      nextBaseUrl = nextBaseUrl.replace(/\/$/, "");
    }

    const nextValue = quote ? `${quote[1]}${nextBaseUrl}${quote[1]}` : nextBaseUrl;
    updated = nextValue !== value;
    return `${prefix}${nextValue}${lineEnding}`;
  }
);

if (updated) fs.writeFileSync(envPath, updatedEnv);
console.log(`BASE_URL ${updated ? "mis à jour" : "déjà à jour"} : ${localIp}`);