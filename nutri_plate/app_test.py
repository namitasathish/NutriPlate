from flask import Flask, request, render_template
import csv
import os

tmpl_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
app = Flask(__name__, template_folder=tmpl_dir)

UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Mock food labels for testing
label = ['apple pie', 'baby back ribs', 'baklava', 'beef carpaccio', 'beef tartare']

# Mock nutrition data
nutrients = [
    {'name': 'protein', 'value': 25.0},
    {'name': 'calcium', 'value': 15.0},
    {'name': 'fat', 'value': 30.0},
    {'name': 'carbohydrates', 'value': 45.0},
    {'name': 'vitamins', 'value': 20.0}
]

# Load nutrition table
with open('nutrition101.csv', 'r') as file:
    reader = csv.reader(file)
    nutrition_table = dict()
    for i, row in enumerate(reader):
        if i == 0:
            continue
        else:
            name = row[1].strip()
        nutrition_table[name] = [
            {'name': 'protein', 'value': float(row[2])},
            {'name': 'calcium', 'value': float(row[3])},
            {'name': 'fat', 'value': float(row[4])},
            {'name': 'carbohydrates', 'value': float(row[5])},
            {'name': 'vitamins', 'value': float(row[6])}
        ]

@app.route('/')
def index():
    img = 'static/profile.jpg'
    return render_template('index.html', img=img)

@app.route('/recognize')
def magic():
    return render_template('recognize.html', img=None)

@app.route('/upload', methods=['POST'])
def upload():
    return render_template('recognize.html', img=None)

@app.route('/predict')
def predict():
    # Mock prediction for testing
    mock_result = {
        'image': 'static/test.jpg',
        'result': {'apple pie': 85.5, 'cheesecake': 10.2, 'carrot cake': 4.3},
        'nutrition': nutrition_table.get('apple pie', nutrients),
        'food': 'https://www.nutritionix.com/food/apple-pie',
        'idx': 0,
        'quantity': 100,
        'ai': 'AI analysis not available - running in test mode'
    }
    
    return render_template('results.html', pack=[mock_result], whole_nutrition=nutrients)

if __name__ == "__main__":
    import click

    @click.command()
    @click.option('--debug', is_flag=True)
    @click.option('--threaded', is_flag=True)
    @click.argument('HOST', default='127.0.0.1')
    @click.argument('PORT', default=5000, type=int)
    def run(debug, threaded, host, port):
        HOST, PORT = host, port
        print("Running NutriPlate in TEST MODE (no ML model)")
        print(f"Access at: http://{HOST}:{PORT}")
        app.run(host=HOST, port=PORT, debug=debug, threaded=threaded)
    run()
