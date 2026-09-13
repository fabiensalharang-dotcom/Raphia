-- §7.10, §8.7 : heure à laquelle la notification du bilan du soir est
-- programmée localement, dans le fuseau du foyer. Réglable par le parent
-- (l'écran de réglage arrivera avec les écrans de configuration, §9.5) ;
-- en attendant, la valeur par défaut correspond à la V1.
alter table household add column digest_time time not null default '21:00:00';
