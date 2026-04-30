# 🚀 DevOps Useful Commands (Ubuntu)

## 🧠 System Monitoring

```bash
btop            # best UI system monitor
htop            # process viewer
top             # basic monitor
free -h         # RAM usage
df -h           # disk usage
uptime          # system load
```

---

## 📂 File & Directory Management

```bash
ls -la          # list files (detailed)
cd /path        # change directory
pwd             # current directory
mkdir folder    # create folder
rm -rf folder   # delete folder
cp -r src dest  # copy
mv old new      # rename/move
```

---

## 🔍 Searching & Finding

```bash
find / -name file.txt        # find file
grep "text" file.txt         # search inside file
grep -r "text" .             # recursive search
history                      # command history
```

---

## 🔐 Permissions

```bash
chmod 755 file              # change permissions
chown user:user file        # change owner
```

---

## ⚙️ Process Management

```bash
ps aux                      # all processes
kill -9 PID                 # kill process
pkill node                  # kill by name
jobs                        # background jobs
```

---

## 🌐 Networking

```bash
ping google.com             # check connectivity
curl http://api.com         # API request
wget url                    # download file
netstat -tulnp              # open ports
ss -tulnp                   # better than netstat
```

---

## 🐳 Docker Commands

```bash
docker ps                   # running containers
docker ps -a                # all containers
docker images               # list images
docker logs container       # logs
docker exec -it container bash   # enter container
docker stop container       # stop
docker start container      # start
docker rm container         # remove
docker rmi image            # remove image
docker build -t app .       # build image
docker run -p 3000:3000 app # run container
```

---

## 🐳 Docker Compose

```bash
docker-compose up           # start services
docker-compose up -d        # detached mode
docker-compose down         # stop services
docker-compose logs         # logs
```

---

## 📦 Package Management

```bash
sudo apt update             # update packages
sudo apt upgrade            # upgrade packages
sudo apt install nginx      # install package
sudo apt remove nginx       # remove package
```

---

## 📄 Logs & Debugging

```bash
tail -f file.log            # live logs
less file.log               # view large file
cat file.log                # print file
```

---

## 🔥 Disk Usage Debugging

```bash
du -sh *                    # folder sizes
du -ah / | sort -rh | head  # largest files
```

---

## 👤 User Management

```bash
whoami                      # current user
id                          # user info
adduser name                # create user
```

---

## 🚀 Git Commands

```bash
git status
git pull
git push
git log
git checkout branch
git clone url
```

---

## ⚡ Productivity Shortcuts

```bash
sudo !!                     # rerun last command as sudo
clear                       # clear terminal
history | grep docker       # search history
```

---

## 🔥 DevOps Tools

```bash
btop            # system monitoring
lazydocker      # docker UI
watch -n 1 cmd  # repeat command every second
```

---

## 💡 Real Debug Workflow

```bash
btop                      # check CPU/RAM
docker ps                 # check containers
docker logs container     # check logs
ss -tulnp                 # check ports
df -h                     # check disk
```
