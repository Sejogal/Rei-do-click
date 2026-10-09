# Configurar o administrador inicial

1. No `backend/.env`, define uma conta inicial com credenciais fortes:

   ```env
   BOOTSTRAP_ADMIN_EMAIL=admin@example.com
   BOOTSTRAP_ADMIN_USERNAME=admin
   BOOTSTRAP_ADMIN_PASSWORD=<palavra-passe-forte>
   ```

2. Aplica a migração da coluna `users.is_admin` a partir da pasta `backend`:

   ```powershell
   alembic upgrade head
   ```

3. Inicia o backend e entra no frontend com o e-mail e a palavra-passe configurados. No arranque, o backend cria essa conta se ainda não existir; se já existir uma conta com esse e-mail, promove-a a admin e ativa-a sem substituir a palavra-passe existente.

4. Abre **Administração** no cabeçalho para consultar utilizadores, alterar planos (`free`, `pro`, `team`) e ativar ou desativar contas.

As rotas de administração exigem uma sessão autenticada de admin. O backend impede a desativação ou remoção da última conta admin ativa. Não publiques nem partilhes o valor de `BOOTSTRAP_ADMIN_PASSWORD`.
