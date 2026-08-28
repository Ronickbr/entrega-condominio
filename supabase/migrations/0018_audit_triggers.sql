-- ============================================================
-- 0018_audit_triggers.sql
-- Etapa 10.4 — Auditoria completa
--
-- Anexa o trigger genérico audit_trigger_row() (criado em 0001) às
-- tabelas de negócio que ainda não o possuíam. As tabelas abaixo já
-- tinham auditoria desde 0001/0003: condominiums, buildings, units,
-- profiles, condo_memberships, residents, staff.
--
-- Novas: packages, third_party_authorizations, system_settings,
--        whatsapp_messages, notifications.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'packages',
    'third_party_authorizations',
    'system_settings',
    'whatsapp_messages',
    'notifications'
  ]
  loop
    execute format(
      'drop trigger if exists %I_audit on public.%I', t, t
    );
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I
       for each row execute function public.audit_trigger_row()',
      t, t
    );
  end loop;
end;
$$;