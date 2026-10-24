import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import inicial from "../../sitios.json" with { type: "json" };

// Lista de sitios del home guardada en Netlify Blobs.
// GET /api/sitios: público.
// POST /api/login { codigo }: valida el código TOTP de mcl-autenticator-code y entrega un token.
// PUT /api/sitios: requiere "Authorization: Bearer <token>".
const CLAVE_BLOB = "sitios";
const PERIODO = 10; // segundos, igual que mcl-autenticator-code
const DURACION_TOKEN = 12 * 60 * 60 * 1000;

const json = (datos, status = 200) =>
  new Response(JSON.stringify(datos), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

function deBase32(texto) {
  const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const limpio = texto.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0, valor = 0;
  const bytes = [];
  for (const c of limpio) {
    const i = alfabeto.indexOf(c);
    if (i < 0) return null;
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(clave, contador) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(contador));
  const h = createHmac("sha1", clave).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

// Acepta el código actual y el de un periodo antes o después (desfase de reloj)
function codigoValido(secreto, codigo) {
  const clave = deBase32(secreto ?? "");
  if (!clave?.length || !/^\d{6}$/.test(codigo)) return false;
  const actual = Math.floor(Date.now() / 1000 / PERIODO);
  return [-1, 0, 1].some((d) => hotp(clave, actual + d) === codigo);
}

const firmar = (secreto, datos) => createHmac("sha256", secreto).update(datos).digest("base64url");

function crearToken(secreto) {
  const expira = String(Date.now() + DURACION_TOKEN);
  return `${expira}.${firmar(secreto, expira)}`;
}

function tokenValido(secreto, cabecera) {
  const token = cabecera?.replace(/^Bearer\s+/i, "") ?? "";
  const [expira, firma] = token.split(".");
  if (!expira || !firma || Number(expira) < Date.now()) return false;
  const a = Buffer.from(firma);
  const b = Buffer.from(firmar(secreto, expira));
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizar(lista) {
  if (!Array.isArray(lista) || lista.length > 500) return null;
  const limpia = [];
  for (const s of lista) {
    const name = String(s?.name ?? "").trim().slice(0, 80);
    const url = String(s?.url ?? "").trim();
    const img = String(s?.img ?? "").trim();
    if (!name || !/^https?:\/\//i.test(url) || (img && !/^https?:\/\//i.test(img))) return null;
    limpia.push({ name, url, img });
  }
  return limpia;
}

export default async (req) => {
  const store = getStore("home");
  const secreto = Netlify.env.get("TOTP_SECRET");
  const ruta = new URL(req.url).pathname;

  if (ruta === "/api/login") {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    if (!secreto) return json({ error: "Falta TOTP_SECRET en el servidor" }, 500);
    const { codigo } = await req.json().catch(() => ({}));
    if (!codigoValido(secreto, String(codigo ?? ""))) return json({ error: "Código incorrecto" }, 401);
    return json({ token: crearToken(secreto) });
  }

  if (req.method === "GET") {
    const guardada = await store.get(CLAVE_BLOB, { type: "json" });
    return json(guardada ?? inicial);
  }

  if (req.method === "PUT") {
    if (!secreto || !tokenValido(secreto, req.headers.get("authorization"))) {
      return json({ error: "Sesión vencida" }, 401);
    }
    let cuerpo;
    try {
      cuerpo = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }
    const lista = normalizar(cuerpo);
    if (!lista) return json({ error: "Datos inválidos: cada sitio necesita nombre y URL http(s)" }, 400);

    await store.setJSON(CLAVE_BLOB, lista);
    return json(lista);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: ["/api/sitios", "/api/login"] };
