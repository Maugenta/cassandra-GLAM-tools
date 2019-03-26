import fcntl
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta
from subprocess import SubprocessError

import psycopg2
import pymongo
from psycopg2 import ProgrammingError

config_file = '../config/config.json'
views_dir = 'temp'

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')


def update(collection, glam):
    collection.update_one({'_id': glam['_id']}, {
                          '$set': {'lastrun': datetime.utcnow()}})


def setup(name):
    logging.info('Running setup.js for %s', name)
    subprocess.run(['nodejs', 'setup.js', name], check=True)
    logging.info('Subprocess setup.js completed')


def etl(name):
    logging.info('Running etl.js for %s', name)
    subprocess.run(['nodejs', 'etl.js', name], check=True)
    logging.info('Subprocess etl.js completed')


def views(name, date):
    logging.info('Running views.py for %s on %s', name, date)
    subprocess.run(['python3', 'views.py', name, date], check=True)
    logging.info('Subprocess views.py completed')


def process(collection, glam):
    if datetime.utcnow() < glam['lastrun'] + timedelta(days=1):
        logging.info('No need to run %s', glam['name'])
        return

    success = True
    logging.info('Running scheduler for %s', glam['name'])

    # Run etl.js
    try:
        etl(glam['name'])
    except SubprocessError:
        success = False
        logging.error('Subprocess etl.js failed')

    # Run views.py
    date = datetime.utcnow() - timedelta(days=2)
    date_str = date.strftime("%Y-%m-%d")

    try:
        views(glam['name'], date_str)
    except SubprocessError:
        success = False
        logging.error('Subprocess views.py failed')

    if success:
        logging.info('Completed scheduler for %s', glam['name'])
        update(collection, glam)
    else:
        logging.error('Failed scheduler for %s', glam['name'])


def clean_downloads():
    for f in os.listdir(views_dir):
        path = os.path.join(views_dir, f)
        if os.path.isfile(path):
            try:
                date = datetime.strptime(f[:10], '%Y-%m-%d')
                if date < datetime.utcnow() - timedelta(days=10):
                    logging.info('Deleting file %s', f)
                    os.remove(path)
            except ValueError:
                pass


def main():
    config = json.load(open(config_file))
    client = pymongo.MongoClient(config['mongodb']['url'])
    db = client[config['mongodb']['database']]
    collection = db[config['mongodb']['collection']]

    for glam in collection.find():
        if 'lastrun' not in glam:
            # this is the first run
            glam['lastrun'] = datetime.fromtimestamp(0)
            logging.info('Running scheduler for %s for the first time', glam['name'])

            # create the database
            connstring = "dbname=template1 user=" + config['postgres']['user'] + \
                " password=" + config['postgres']['password'] + \
                " host=" + config['postgres']['host']
            conn = psycopg2.connect(connstring)
            conn.autocommit = True
            curse = conn.cursor()
            try:
                curse.execute("CREATE DATABASE " + glam['database'])
            except ProgrammingError:
                # the database is already available
                pass
            finally:
                conn.close()

            # run the setup
            try:
                setup(glam['name'])
            except SubprocessError:
                logging.error('Subprocess setup.py failed')

            # for all the dates available
            for f in os.listdir(views_dir):
                path = os.path.join(views_dir, f)
                if os.path.isfile(path):
                    try:
                        date = datetime.strptime(f[:10], '%Y-%m-%d')
                    except ValueError:
                        continue

                    try:
                        views(glam['name'], f[:10])
                    except SubprocessError:
                        logging.error('Subprocess views.py failed')

        # process the glam
        process(collection, glam)

    # clean expired downloads
    clean_downloads()


if __name__ == '__main__':
    # change the working directory to the script's own directory
    script_dir = os.path.dirname(sys.argv[0])
    if script_dir != '':
        os.chdir(script_dir)

    try:
        lockfile = open('/tmp/cassandra.lock', 'w')
        fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
        main()
        fcntl.flock(lockfile, fcntl.LOCK_UN)
    except IOError:
        raise SystemExit('Scheduler is already running')