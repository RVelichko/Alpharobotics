echo "************** Install all libraries fo Alfarobotics project **************************"

sudo apt-get install -y build-essential git cmake
sudo apt-get install -y dpkg debconf
sudo apt-get install -y libbz2-dev libzip-dev
sudo apt-get install -y libboost1.55-all-dev
sudo apt-get install -y python
sudo apt-get install -y libjsoncpp-dev

sudo apt-get install -y libevent-dev  automake libtool flex bison pkg-config libssl-dev
echo "download, compile and install Thrift..."
MY_CURRENT_DIR=`pwd`
rm -rf /tmp/thrift
mkdir /tmp/thrift
cd /tmp/thrift
wget -t 3 http://apache-mirror.rbc.ru/pub/apache/thrift/0.9.2/thrift-0.9.2.tar.gz
tar xfzv ./thrift-0.9.2.tar.gz
cd ./thrift-0.9.2
./bootstrap.sh
./configure CXXFLAGS='-std=c++0x'
make -j5
sudo make install
cd $MY_CURRENT_DIR
rm -rf /tmp/thrift
echo "Thrift installation completed"

sudo apt-get install -y libuv-dev
sudo apt-get install -y libssl-dev
sudo apt-get install -y libssh2-1-dev
