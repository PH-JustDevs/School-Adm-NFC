// Gera o hash bcrypt para ADMIN_PASSWORD_HASH.
// Uso (a senha vai por variável de ambiente para não ficar no histórico do shell):
//   PASSWORD='sua-senha' npm run hash-password
import bcrypt from "bcryptjs";

// Função async em vez de top-level await: o tsx compila como CJS (package.json sem "type": "module").
async function main() {
  const password = process.env.PASSWORD ?? "";
  if (password.length < 12) {
    console.error("Defina PASSWORD com pelo menos 12 caracteres.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  // O hash tem "$": no .env precisa estar entre aspas duplas com cada "$" escapado como "\$",
  // senão o Next expande "$2b", "$12"... como variáveis e o valor fica vazio.
  const escaped = hash.replace(/\$/g, "\\$");
  console.log("\nAdicione ao seu .env:\n");
  console.log(`ADMIN_PASSWORD_HASH="${escaped}"`);
}

main();
