"""
Gunicorn configuration file for production deployment.
Run with: gunicorn --config gunicorn.conf.py "your_app:create_app()"
Or more accurately for websockets: gunicorn -k eventlet -w 1 "your_app.app:socketio.run(app)"
Let's assume the latter for our SocketIO setup. The file is for configuration.
"""

import multiprocessing

# Server socket
bind = "0.0.0.0:8000"

# Worker processes
# The 'gevent' or 'eventlet' worker is ESSENTIAL for Flask-SocketIO
worker_class = 'eventlet' 
workers = multiprocessing.cpu_count() * 2 + 1
threads = 2

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stdout
loglevel = "info"

# Process naming
proc_name = "nexus_platform"

print(f"Gunicorn configured for Nexus Platform: {workers} workers, {threads} threads each.")