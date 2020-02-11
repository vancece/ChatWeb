create table message(
sender integer,
receiver integer,
time timestamp without time zone,
type character(1),
msg text,
status character(1),
id serial primary key);
