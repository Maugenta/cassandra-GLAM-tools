﻿create or replace function dailyInsert(text, date,integer, integer, integer)
returns integer as $$
declare id integer;
begin
select media_id into id from media_index where media_name=$1;
if not found then
insert into media_index(media_name) values ($1) returning media_id into id;
end if;
begin
insert into media_accesses values(id,$2,$3,$4,$5);
EXCEPTION   
    WHEN OTHERS THEN RETURN -1;
end;
return id;
end;
$$language plpgsql;
select * from dailyInsert('lallo','23/10/2017',1,2,3)