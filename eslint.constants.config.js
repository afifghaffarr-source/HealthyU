// Lint override khusus untuk src/lib/constants.ts.
//
// Tujuannya satu: setiap kali kontributor menambahkan `export const` baru
// di file konstanta, ESLint memunculkan peringatan agar penulis MEMASTIKAN
// konstanta tersebut juga tercatat di tabel "What it controls" pada header
// file. Selector ESLint tidak bisa membaca komentar JSDoc, jadi pola yang
// digunakan adalah: warn semua `export const`, lalu setiap baris yang sudah
// terdokumentasi menambahkan `// eslint-disable-next-line no-restricted-syntax`
// sebagai bukti review.
//
// File ini sengaja dipisah dari `eslint.config.js` agar konvensi khusus
// constants gampang ditemukan oleh reviewer (cari "constants" di root repo).
export default {
  files: ["src/lib/constants.ts"],
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        selector: "ExportNamedDeclaration > VariableDeclaration",
        message:
          "constants.ts: pastikan konstanta ini sudah ditambahkan ke tabel doc di header file (lalu // eslint-disable-next-line no-restricted-syntax pada baris ini).",
      },
    ],
  },
};