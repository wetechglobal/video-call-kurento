# Install kurento media server
# trusty 14.04 xenial 16.04 zesty 17.04
echo "deb http://ubuntu.kurento.org xenial kms6" | sudo tee /etc/apt/sources.list.d/kurento.list
wget -O - http://ubuntu.kurento.org/kurento.gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install kurento-server
sudo service kurento-media-server-6.0 start

# Add kurento media server service to startup tasks
# https://askubuntu.com/questions/9382
sudo update-rc.d kurento-media-server-6.0 defaults
sudo update-rc.d kurento-media-server-6.0 enable

# Check process and port
sudo netstat -putan | grep kurento

# Test connection
telnet 127.0.0.1 8888
