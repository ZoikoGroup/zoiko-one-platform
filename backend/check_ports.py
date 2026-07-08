import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.bind(("127.0.0.1", 8000))
    print("Port 8000 is free")
except socket.error as e:
    print("Port 8000 is in use:", e)
finally:
    s.close()

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.bind(("127.0.0.1", 5173))
    print("Port 5173 is free")
except socket.error as e:
    print("Port 5173 is in use:", e)
finally:
    s.close()
