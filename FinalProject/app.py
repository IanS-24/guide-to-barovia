from flask import Flask, render_template, request, session
from flask_mysqldb import MySQL

app = Flask(__name__)
app.config['MYSQL_HOST'] = 'mysql.2324.lakeside-cs.org'
app.config['MYSQL_USER'] = 'student2324'
app.config['MYSQL_PASSWORD'] = 'm545CS42324'
app.config['MYSQL_DB'] = '2324finalproject'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'
mysql = MySQL(app)

app.secret_key = '2ab9ed4d12e236c78afcb9a393ec15f'

@app.route('/', methods=['POST', 'GET'])
def index():
	session['ians_playerView'] = 'true'
	#if swapping view
	if (request.method == 'POST'):
		session['ians_playerView'] = request.values.get("playerView")
	#if returning to home page
	elif (request.values.get("currentView") != None):
		session['ians_playerView'] = request.values.get("currentView")
	return render_template('index.html.j2', playerView=session['ians_playerView'])


@app.route('/map', methods=['POST', 'GET'])
def map():
	cursor = mysql.connection.cursor()
	query1 = "SELECT name FROM ians_npcs;"
	cursor.execute(query1)
	npcInfo = cursor.fetchall()

	#if user added a pin
	if (request.method == 'POST'):
		locName = request.values.get("locName")
		locDesc = request.values.get("locDesc")
		locShortDesc = locDesc[0: 60] + "..."
		if (request.values.get("locEncountered") != None):
			encountered = 1
		else:
			encountered = 0
		query4 = "INSERT INTO ians_locations(name, short_desc, description, encountered, left_coord, top_coord) VALUES(%s, %s, %s, %s, %s, %s); COMMIT;"
		queryVars = (locName, locShortDesc, locDesc, encountered, request.values.get("leftCoord"), request.values.get("topCoord"))
		cursor.execute(query4, queryVars)
		npcs = request.values.getlist("npc-included")
		for i in range(len(npcs)):
			if (npcs[i] == "true"):
				query = "INSERT INTO ians_connections(location_name, npc_name) VALUES(%s, %s); COMMIT;"
				queryVars = (locName, npcInfo[i]['name'])
				cursor.execute(query, queryVars)
	
	#if in Player View, only select encountered locations and NPCs
	if (session['ians_playerView'] == 'true'):
		query2 = "SELECT * FROM ians_locations WHERE encountered = 1;"
		query3 = "SELECT * FROM ians_connections con JOIN ians_npcs npc ON con.npc_name=npc.name WHERE npc.encountered = 1;"
	else:
		query2 = "SELECT * FROM ians_locations;"
		query3 = "SELECT * FROM ians_connections;"
	cursor.execute(query2)
	locInfo = cursor.fetchall()
	cursor.execute(query3)
	connections = cursor.fetchall()
	return render_template('map.html.j2', locInfo=locInfo, connections=connections, npcInfo=npcInfo, playerView=session['ians_playerView'])


@app.route('/location')
def location():
	name = request.values.get("name")
	cursor = mysql.connection.cursor()
	query = "SELECT * FROM ians_locations WHERE name = %s;"
	queryVars = (name,)
	cursor.execute(query, queryVars)
	locInfo = cursor.fetchall()
	#if in Player View, only select encountered NPCs
	if (session['ians_playerView'] == 'true'):
		query2 = "SELECT npc_name FROM ians_connections con JOIN ians_npcs npc ON con.npc_name=npc.name WHERE location_name = %s AND npc.encountered = 1;"
	else:
		query2 = "SELECT npc_name FROM ians_connections con JOIN ians_npcs npc ON con.npc_name=npc.name WHERE location_name = %s;"
	queryVars = (name,)
	cursor.execute(query2, queryVars)
	npcInfo = cursor.fetchall()
	return render_template('location.html.j2', info=locInfo, npcs=npcInfo, playerView=session['ians_playerView'])


@app.route('/npc')
def npc():
	name = request.values.get("name")
	cursor = mysql.connection.cursor()
	query = "SELECT * FROM ians_npcs WHERE name = %s;"
	queryVars = (name,)
	cursor.execute(query, queryVars)
	npcInfo = cursor.fetchall()
	#if in Player View, only select locations we've encountered
	if (session['ians_playerView'] == 'true'):
		query2 = "SELECT location_name FROM ians_connections con JOIN ians_locations loc ON con.location_name=loc.name WHERE npc_name = %s AND loc.encountered = 1;"
	else:
		query2 = "SELECT location_name FROM ians_connections WHERE npc_name = %s;"
	cursor.execute(query2, queryVars)
	locInfo = cursor.fetchall()

	query3 = "SELECT tag_name FROM ians_tags WHERE npc_name = %s;"
	cursor.execute(query3, queryVars)
	tagInfo = cursor.fetchall()
	return render_template('npc.html.j2', info=npcInfo, locations=locInfo, tags=tagInfo, playerView=session['ians_playerView'])


@app.route('/npc-list', methods=['POST', 'GET'])
def npc_list():
	cursor = mysql.connection.cursor()
	query = "SELECT DISTINCT tag_name FROM ians_tags;"
	cursor.execute(query)
	uniqueTags = cursor.fetchall()

	#if user added a new npc
	if (request.method == 'POST'):
		if (request.values.get("locEncountered") != None):
			encountered = 1
		else:
			encountered = 0
		npcName = request.values.get("npcName")
		query1 = "INSERT INTO ians_npcs(name, description, encountered) VALUES(%s, %s, %s); COMMIT;"
		queryVars = (npcName, request.values.get("npcDesc"), encountered)
		cursor.execute(query1, queryVars)

		#add connected locations
		locations = request.values.getlist("related-location")
		query2 = "SELECT name FROM ians_locations;"
		cursor.execute(query2)
		allLocations = cursor.fetchall()
		for i in range(len(locations)):
			if (locations[i] == "true"):
				query = "INSERT INTO ians_connections(location_name, npc_name) VALUES(%s, %s); COMMIT;"
				queryVars = (allLocations[i]['name'], npcName)
				cursor.execute(query, queryVars)

		#add connected tags
		tags = request.values.getlist("related-tag")
		for i in range(len(tags)):
			if (tags[i] == "true"):
				query = "INSERT INTO ians_tags(npc_name, tag_name) VALUES(%s, %s); COMMIT;"
				queryVars = (npcName, uniqueTags[i]['tag_name'])
				cursor.execute(query, queryVars)

	#if in Player View, only select encountered NPCs
	if (session['ians_playerView'] == 'true'):
		query3 = "SELECT name FROM ians_npcs WHERE encountered = 1;"
	else:
		query3 = "SELECT name FROM ians_npcs;"
	cursor.execute(query3)
	npcInfo = cursor.fetchall()

	query4 = "SELECT * FROM ians_tags;"
	cursor.execute(query4)
	tagInfo = cursor.fetchall()
	return render_template('npc-list.html.j2', npcs=npcInfo, uniqueTags=uniqueTags, tagInfo=tagInfo, playerView=session['ians_playerView'])


@app.route('/add-npc')
def add_npc():
	cursor = mysql.connection.cursor()
	query = "SELECT name FROM ians_locations;"
	cursor.execute(query)
	locInfo = cursor.fetchall()
	query = "SELECT DISTINCT tag_name FROM ians_tags;"
	cursor.execute(query)
	tagInfo = cursor.fetchall()
	return render_template('add-npc.html.j2', locInfo=locInfo, tagInfo=tagInfo, playerView=session['ians_playerView'])