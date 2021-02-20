# https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Test the connection
telnet 127.0.0.1 5432

# Restart the service if the test fails
# https://askubuntu.com/questions/626501
sudo /etc/init.d/postgresql restart

# Open port for development
# https://stackoverflow.com/questions/17838613
sudo nano /etc/postgresql/9.5/main/postgresql.conf
# https://dba.stackexchange.com/questions/83984
sudo nano /etc/postgresql/9.5/main/pg_hba.conf

# Switch to postgres user
sudo -i -u postgres
# Start psql with db=postgres
psql postgres

# List all users and dbs
\du
\list

# Create user name devusr with password devpwd
CREATE ROLE devusr WITH LOGIN PASSWORD 'devpwd';
# Add role into user devusr
ALTER ROLE devusr SUPERUSER;
# Create db name devdb
DROP DATABASE devdb;
CREATE DATABASE devdb;
# Grant db owner to user devusr
GRANT ALL PRIVILEGES ON DATABASE devdb TO devusr;
# Check users and dbs again
\du
\list

# Connect to devdb and check table
\c devdb
\dt

# Quit
\q

# Rename table
psql devdb
DROP TABLE "yyy";
ALTER TABLE "xxx" RENAME TO "yyy";

ALTER TABLE "User" ADD COLUMN "title" CHARACTER VARYING(MAX) NOT NULL DEFAULT '';

initdb /usr/local/var/postgres
pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/errors.log start

CREATE ROLE limina WITH LOGIN PASSWORD 'limina';
ALTER ROLE limina SUPERUSER;
CREATE DATABASE limina;
GRANT ALL PRIVILEGES ON DATABASE limina TO limina;

psql limina < ~/Download/

ALTER TABLE "Case" RENAME "claimant" TO "claimantId";

ALTER TABLE "User" ADD COLUMN "phone" CHARACTER VARYING(32) NOT NULL DEFAULT '';
ALTER TABLE "RoomToken" ADD COLUMN "title" CHARACTER VARYING(32) NOT NULL DEFAULT '';
ALTER TABLE "RoomToken" ADD COLUMN "phone" CHARACTER VARYING(32) NOT NULL DEFAULT '';
ALTER TABLE "Case" ADD COLUMN "claimant" CHARACTER VARYING(128) NOT NULL DEFAULT '';
ALTER TABLE "RoomToken" ADD COLUMN "joined" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Room" ADD COLUMN "assessmentId" CHARACTER VARYING(32);
