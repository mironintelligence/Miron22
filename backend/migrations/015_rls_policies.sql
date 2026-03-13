ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contract_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own
ON notifications
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own
ON notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_contracts_select_own ON user_contracts;
CREATE POLICY user_contracts_select_own
ON user_contracts
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_contracts_insert_own ON user_contracts;
CREATE POLICY user_contracts_insert_own
ON user_contracts
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_contracts_update_own ON user_contracts;
CREATE POLICY user_contracts_update_own
ON user_contracts
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_contracts_delete_own ON user_contracts;
CREATE POLICY user_contracts_delete_own
ON user_contracts
FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS contract_templates_select_authed ON contract_templates;
CREATE POLICY contract_templates_select_authed
ON contract_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

