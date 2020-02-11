create table usermessage(
name varchar(15),
id serial primary key,
email varchar(25),
tel varchar(11),
password character(32),
status character(1),
ill character(1),
power character(1),
last_login_time timestamp without time zone);
