-- Retour famille pilote (sept. 2026) : les tuiles de règles doivent être
-- colorées par thématique. rule_template porte déjà category (0008), mais
-- rule_instance ne la copiait pas — un libellé reformulé par le parent
-- (reformulerRegle) ne doit pas perdre sa thématique pour autant, donc on
-- la dénormalise sur l'instance plutôt que de dépendre de template_id
-- (nullable) à chaque lecture.
alter table rule_instance add column category text;

update rule_instance ri
set category = rt.category
from rule_template rt
where ri.template_id = rt.id;

update rule_instance set category = 'organisation' where category is null;

alter table rule_instance alter column category set default 'organisation';
alter table rule_instance alter column category set not null;
alter table rule_instance add constraint rule_instance_category_check
  check (category in ('autonomie', 'securite', 'social', 'scolaire', 'ecrans', 'emotions', 'organisation'));
