import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { query } = await import("../lib/db");
  await query(
    `UPDATE cosmoroot.NKR_LabKabul SET OlusturmaTarihi = GETDATE() WHERE ID IN (10004, 10005)`
  );
  const r = await query(
    `SELECT ID, NkrID, RaporFormati, KabulTarihi, OlusturmaTarihi
     FROM cosmoroot.NKR_LabKabul WHERE ID IN (10004, 10005)`
  );
  console.dir(r, { depth: null });
  process.exit(0);
}
main().catch((e) => { console.error("HATA:", e); process.exit(1); });
