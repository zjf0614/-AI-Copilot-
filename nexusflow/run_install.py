import subprocess
import os

os.chdir(r"E:\试验\nexusflow")
print(f"Working directory: {os.getcwd()}")
result = subprocess.run(["npm", "install"], capture_output=False, text=True)
print(f"Exit code: {result.returncode}")
