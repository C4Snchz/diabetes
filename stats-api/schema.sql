-- Anonymous answers only: option indexes and the day. No IP, no exact height/weight, no time of day.
CREATE TABLE IF NOT EXISTS tests (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	day TEXT NOT NULL,
	score INTEGER NOT NULL,
	sexo INTEGER, edad INTEGER, imc INTEGER, cintura INTEGER,
	actividad INTEGER, verduras INTEGER, presion INTEGER, glucosa INTEGER, familia INTEGER
);
CREATE TABLE IF NOT EXISTS games (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	day TEXT NOT NULL,
	hits INTEGER NOT NULL,
	picks TEXT NOT NULL -- one char per card: 1 = acertó, 0 = no
);
