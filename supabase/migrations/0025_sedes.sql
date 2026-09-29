-- Las sedes del grupo (CEB-191): los concesionarios de las empresas que tienen
-- varios. Toyota e Induvenpa tienen sede unica, asi que no tienen ninguna aqui:
-- sin sede es toda la empresa. Holding tampoco.
insert into sede (empresa_id, nombre)
select e.id, s.nombre
from (values ('KIA', '212'), ('KIA', 'Centro'), ('Changan', 'Caracas'), ('Changan', 'Auto Bengala')) as s (empresa, nombre)
join empresa e on e.nombre = s.empresa;
