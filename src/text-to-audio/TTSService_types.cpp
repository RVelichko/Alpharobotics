/**
 * Autogenerated by Thrift Compiler (0.9.2)
 *
 * DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
 *  @generated
 */
#include "TTSService_types.h"

#include <algorithm>
#include <ostream>

#include <thrift/TToString.h>

namespace arobot { namespace tts {


ServiceError::~ServiceError() throw() {
}


void ServiceError::__set_what(const std::string& val) {
  this->what = val;
}

const char* ServiceError::ascii_fingerprint = "EFB929595D312AC8F305D5A794CFEDA1";
const uint8_t ServiceError::binary_fingerprint[16] = {0xEF,0xB9,0x29,0x59,0x5D,0x31,0x2A,0xC8,0xF3,0x05,0xD5,0xA7,0x94,0xCF,0xED,0xA1};

uint32_t ServiceError::read(::apache::thrift::protocol::TProtocol* iprot) {

  uint32_t xfer = 0;
  std::string fname;
  ::apache::thrift::protocol::TType ftype;
  int16_t fid;

  xfer += iprot->readStructBegin(fname);

  using ::apache::thrift::protocol::TProtocolException;


  while (true)
  {
    xfer += iprot->readFieldBegin(fname, ftype, fid);
    if (ftype == ::apache::thrift::protocol::T_STOP) {
      break;
    }
    switch (fid)
    {
      case 1:
        if (ftype == ::apache::thrift::protocol::T_STRING) {
          xfer += iprot->readString(this->what);
          this->__isset.what = true;
        } else {
          xfer += iprot->skip(ftype);
        }
        break;
      default:
        xfer += iprot->skip(ftype);
        break;
    }
    xfer += iprot->readFieldEnd();
  }

  xfer += iprot->readStructEnd();

  return xfer;
}

uint32_t ServiceError::write(::apache::thrift::protocol::TProtocol* oprot) const {
  uint32_t xfer = 0;
  oprot->incrementRecursionDepth();
  xfer += oprot->writeStructBegin("ServiceError");

  xfer += oprot->writeFieldBegin("what", ::apache::thrift::protocol::T_STRING, 1);
  xfer += oprot->writeString(this->what);
  xfer += oprot->writeFieldEnd();

  xfer += oprot->writeFieldStop();
  xfer += oprot->writeStructEnd();
  oprot->decrementRecursionDepth();
  return xfer;
}

void swap(ServiceError &a, ServiceError &b) {
  using ::std::swap;
  swap(a.what, b.what);
  swap(a.__isset, b.__isset);
}

ServiceError::ServiceError(const ServiceError& other0) : TException() {
  what = other0.what;
  __isset = other0.__isset;
}
ServiceError& ServiceError::operator=(const ServiceError& other1) {
  what = other1.what;
  __isset = other1.__isset;
  return *this;
}
std::ostream& operator<<(std::ostream& out, const ServiceError& obj) {
  using apache::thrift::to_string;
  out << "ServiceError(";
  out << "what=" << to_string(obj.what);
  out << ")";
  return out;
}

}} // namespace
