-- Remove tabelas e tipos anteriores (garantia de reexecuÃ§Ã£o do script)
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL NOT NULL PRIMARY KEY,
    username VARCHAR(200) NOT NULL,
    password VARCHAR(200) NOT NULL,
    phone VARCHAR(100) NOT NULL,
    CONSTRAINT users_username_unique UNIQUE (username)
);

-- FunÃ§Ã£o para tratar a duplicidade
-- O USING ERRCODE = 'unique_violation' mantÃ©m o cÃ³digo de erro do PostgreSQL para integridade de chave Ãºnica (23505), o que ajuda se o backend quiser tratar por cÃ³digo.
CREATE OR REPLACE FUNCTION check_unique_username()
RETURNS TRIGGER AS $$
BEGIN
	-- Verifica se jÃ¡ existe username igual
    IF EXISTS (SELECT 1 FROM users WHERE username = NEW.username AND id <> COALESCE(NEW.id, -1)) THEN
        RAISE EXCEPTION 'O nome de usuÃ¡rio "%" jÃ¡ estÃ¡ cadastrado. Escolha outro.', NEW.username
            USING ERRCODE = 'unique_violation'; -- cÃ³digo de violaÃ§Ã£o de chave Ãºnica
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar username Ãºnico antes de inserir ou atualizar
CREATE TRIGGER trg_check_unique_username
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION check_unique_username();

