import urequests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Set your credentials file name and sheet ID
CREDENTIALS_FILE = 'credentials.json'
SHEET_ID = 'your-sheet-id'

# Read the credentials file
with open(CREDENTIALS_FILE, 'r') as f:
    credentials_data = f.read()

# Create credentials object from JSON data
credentials = Credentials.from_authorized_user_info(info=credentials_data)

# Build the Google Sheets API client
service = build('sheets', 'v4', credentials=credentials)

# Define the range of cells to update
range_name = 'Sheet1!A1:B2'

# Define the values to update
values = [
    ['Temperature', 25.6],
    ['Humidity', 64.2]
]

# Build the request body
value_input_option = 'USER_ENTERED'
data = {'range': range_name, 'values': values, 'majorDimension': 'ROWS'}
body = {'valueInputOption': value_input_option, 'data': [data]}

# Make the request to update the sheet
try:
    response = service.spreadsheets().values().batchUpdate(spreadsheetId=SHEET_ID, body=body).execute()
    print(f'Updated {response["totalUpdatedCells"]} cells in range {range_name}')
except HttpError as error:
    print(f'An error occurred: {error}')

