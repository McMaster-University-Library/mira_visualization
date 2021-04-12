import pandas as pd
import json
import numpy as np
import pyodbc
import yaml

MIRA_MEMBERS_CSV_CHECK_COLS = ["email", "first_name", "last_name", "macid", "mira_bio_url", "position", "primary_faculty", "x_value", "y_value"]
DIRECTORY = "/DATA/www/html/mira/shared_assets/"

# ODBC stuff
with open("/DATA/creds.yaml") as file:
    ODBC_CREDS = yaml.safe_load(file)

ODBC_CREDS = ODBC_CREDS["mira_visualization"]
ODBC_USER = ODBC_CREDS["ODBC_USER"]
ODBC_PASS = ODBC_CREDS["ODBC_PASSWORD"]
SERVER = ODBC_CREDS["ODBC_SERVER"]
DATABASE = ODBC_CREDS["ODBC_DATABASE"]


########################################################################################################################
# MIRA MEMBERS JSON

df = pd.read_csv(DIRECTORY + "mira_members.csv")
df = df[MIRA_MEMBERS_CSV_CHECK_COLS]  # Removing un-needed columns
df.dropna(inplace=True)  # Removing rows where 1 or more needed columns were left blank
df["faculty2"] = df["primary_faculty"]  # we need this in mira.js
df["primary_faculty"] = np.vectorize(lambda x: x.replace(" ", ""))(df["primary_faculty"])  # removing spaces
mira_members_list = df.to_dict("records")

with open(DIRECTORY + "mira_members.json", "w") as file:
    json.dump(mira_members_list, file)


########################################################################################################################
# Project Grant LEVELS JSON

df = pd.read_csv(DIRECTORY + "project_grant.csv")
df.fillna("", inplace=True)
df["key"] = df["level1"] + df["level2"] + df["level3"]
project_grant_rows = df.to_dict("records")
levels = dict()

for row in project_grant_rows:

    levels[row["level1"]] = levels.get(row["level1"], dict())

    # If level ends at level1
    if len(row["level2"]) == 0:
        levels[row["level1"]] = row["key"]
        continue

    # proceed to levels 2 and 3
    else:
        levels[row["level1"]][row["level2"]] = levels[row["level1"]].get(row["level2"], dict())

    # If level ends at level2
    if len(row["level3"]) == 0:
        levels[row["level1"]][row["level2"]] = row["key"]
        continue

    # proceed to level3
    else:
        levels[row["level1"]][row["level2"]][row["level3"]] = row["key"]


with open(DIRECTORY + "levels.json", "w") as file:
    json.dump(levels, file)


########################################################################################################################
# Project Grant PG JSON

df = pd.read_csv(DIRECTORY + "project_grant.csv")
df.fillna("", inplace=True)
df["key"] = df["level1"] + df["level2"] + df["level3"]
project_grant_rows = df.to_dict("records")
pg = dict()  # project and grant data, key = id of project, val= {"members":[], "pi":[], "blurb_title:"", "blurb":""}


for row in project_grant_rows:
    base = {"members": [], "pi": [], "blurb_title": "", "blurb": ""}
    key = row["key"]
    pg[key] = pg.get(key, base)

    pg[key]["members"] += [row["macid"]]

    if row["pi"] == "TRUE":
        pg[key]["pi"] += [row["macid"]]

    if len(row["blurb_title"]) > len(pg[key]["blurb_title"]):
        pg[key]["blurb_title"] = row["blurb_title"]

    if len(row["blurb"]) > len(pg[key]["blurb"]):
        pg[key]["blurb"] = row["blurb"]


with open(DIRECTORY + "pg.json", "w") as file:
    json.dump(pg, file)



########################################################################################################################
# Co-Author Network JSON


#conn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER='+SERVER+';DATABASE='+DATABASE+';UID='+ ODBC_USER +';PWD='+ ODBC_PASS+';Integrated_Security=True')
conn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER='+SERVER+';DATABASE='+DATABASE+';UID='+ ODBC_USER +';PWD='+ ODBC_PASS)
cursor = conn.cursor()

df = pd.read_csv(DIRECTORY + "mira_members.csv")
df = df[MIRA_MEMBERS_CSV_CHECK_COLS]  # Removing un-needed columns
df.dropna(inplace=True)  # Removing rows where 1 or more needed columns were left blank
macids = set(df["macid"])


# query returns a list of tuples. tuple[0] is a macid and tuple[1] is a macid that tuple[0] has coauthored with.
query = "SELECT DISTINCT U.[Username] as macid1, U2.[Username] as macid2 " \
        "FROM [elements-mcmaster2-reporting].[dbo].[User] as U " \
        "INNER JOIN [elements-mcmaster2-reporting].[dbo].[Publication User Relationship] as PUR " \
        "ON PUR.[User ID] = U.[ID] " \
        "INNER JOIN [elements-mcmaster2-reporting].[dbo].[Publication User Relationship] as PUR2 " \
        "ON PUR.[Publication ID] = PUR2.[Publication ID] " \
        "INNER JOIN [elements-mcmaster2-reporting].[dbo].[User] as U2 " \
        "ON U2.[ID] = PUR2.[User ID] " \
        "WHERE U.[USERNAME] in ('" + "', '".join(macids) + "') " + "AND U2.[USERNAME] in ('" + "', '".join(macids) + "') "

cursor.execute(query)

coauthor_list = list(cursor)

####  temporary df stuff begins here. On computers with odbc configured this isn't needed. This is here because i'm
### developing on a computer that doesn't have pyodbc configured nor has a direct connection to the DB.

df = pd.DataFrame()
macid1 = list(map(lambda x: x[0], coauthor_list))
macid2 = list(map(lambda x: x[1], coauthor_list))
df["macid1"] = macid1
df["macid2"] = macid2
df.to_csv(DIRECTORY + "coauthor_list.csv", index=False)

df = pd.read_csv(DIRECTORY + "coauthor_list.csv")
coauthor_list = []
for index, row in df.iterrows():
    # Create list for the current row
    coauthor_list += [[row.macid1, row.macid2]]

####  temporary df stuff ends here

coauthor_network = dict()  # Key: macid val: list of coauthor macids (list of macids include original author as well).
for pair in coauthor_list:
    coauthor_network[pair[0]] = coauthor_network.get(pair[0], list())
    coauthor_network[pair[0]] += [pair[1]]

with open(DIRECTORY + "coauthor_network.json", "w") as file:
    json.dump(coauthor_network, file)
