# Depositing System

This is a simple depositing system built with Node.js, Express, and MongoDB.

## Setup and Deployment

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd depositing_system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure MongoDB Connection:**
    Create a `.env` file in the root of your project with the following content:

    ```
    MONGO_URI="mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority&appName=<app-name>"
    ```

    Replace `<username>`, `<password>`, `<cluster-url>`, `<database-name>`, and `<app-name>` with your MongoDB connection details.

    If `MONGO_URI` is not set in the `.env` file, it will default to `mongodb://localhost:27017/deposit_system` for local development.

4.  **Start the server:**
    ```bash
    node server.js
    ```
    The server will typically run on `http://localhost:3000`.

5.  **Nginx Configuration (for production deployment):**
    If you are using Nginx as a reverse proxy, ensure your Nginx configuration forwards API requests to your Node.js server (default port 3000).

    A basic Nginx configuration snippet for proxying API requests:
    ```nginx
    server {
        listen 80;
        server_name your_domain.com;

        location / {
            root /path/to/your/depositing_system; # <--- IMPORTANT: Change this
            try_files $uri $uri/ =404;
        }

        location /api/ {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    Remember to replace `/path/to/your/depositing_system` with the actual path to your project.

## Managing User Passwords

The `updatePassword.js` script allows you to list users and update their passwords.

1.  **List all available users:**
    ```bash
    node updatePassword.js
    ```
    This will print a list of all usernames currently in the database.

2.  **Update a user's password:**
    ```bash
    node updatePassword.js <username> <new_password>
    ```
    Replace `<username>` with the actual username and `<new_password>` with the desired new password.

    **Example:**
    ```bash
    node updatePassword.js robin robin01716
    ```

    **Note:** Ensure your `.env` file is correctly configured with `MONGO_URI` when running this script.