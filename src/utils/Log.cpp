#include <dirent.h>
#include <sys/stat.h>

#include <thread>
#include <iostream>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <stdexcept>

#include "Log.hpp"

using namespace arobot;
using namespace utils;

#ifndef LOG_MAX_QUEUE_SIZE
# define LOG_MAX_QUEUE_SIZE std::numeric_limits<std::uint8_t>::max()
#endif


std::string level_name(const Log::Level &value) {
  switch (value) {
    case TEST:    return "TEST";
    case INFO:    return "INFO";
    case DEBUG:   return "DEBUG";
    case WARNING: return "WARNING";
    case ERROR:   return "ERROR";
    case FATAL:   return "FATAL";
    default: throw std::runtime_error("LOD ERROR: Udeclared level");
  }
}


static std::string LogFileName(std::uint32_t i) {
  time_t now = time(NULL);
  struct tm * ptm = localtime(&now);
  char buf[32] = {0};
  /// Format: Mo, 15.06.2009 20:20:00
  strftime(buf, 32, "%a,%d.%m.%Y-%H:%M:%S", ptm);
  return (std::string(buf) + "-" + std::to_string(i) + ".log");
}


Log::Log()
  : _file_number(0)
  , _file_size(std::numeric_limits<std::uint32_t>::max())
  , _file_line_number(0)
  , _is_run(false)
  , _log_out(false)
  , _log_out_file(true)
  , _log_file_depth(LOG_FILE_DEPTH) {
  start();
}


Log::~Log() {
  stop();
  std::cout << "Log is stopped.\n" << std::flush;
}


void Log::init(bool log_out, bool log_out_file, uint32_t log_file_depth) {
  _log_out        = log_out;
  _log_out_file   = log_out_file;
  _log_file_depth = LOG_FILE_DEPTH;
}


void Log::execute() {
  while (true) {
    QueueTask task;
    {
      std::unique_lock<std::mutex> lock(_mutex);

      while (_queue.empty()) {
        if (not _is_run) {
          close();
          return;
        }
        _cond.wait(lock);
      }
      task = _queue.front();
      _queue.pop();
    }
    auto level   = std::get<0>(task);
    auto module  = std::get<1>(task);
    auto message = std::get<2>(task);
    auto time    = std::get<3>(task);

    std::stringstream ss;
    ss << (++_file_line_number);
    ss << ". [" << time << "]";
    ss << " [" << level_name(level) << "]";
    ss << " [" << module << "]";
    ss << " " << message << "\n";

    if (_log_out) {
      std::cout << ss.str() << std::flush;
    }

    if (_log_out_file) {
      if (_file_size >= _log_file_depth) {
        open();
      }

      if (_file.is_open()) {
        _file << ss.str();
        _file_size = static_cast<std::uint32_t>(_file.tellp());
      }
    }
  }
}


void Log::handleCancel() {
  _cond.notify_one();
}


void Log::open() {
  if (_file.is_open()) {
    close();
  }
  _file.open(LogFileName(_file_number));
}


void Log::close() {
  if (not _file.is_open()) {
    return;
  }
  _file.close();

  auto now = std::chrono::system_clock::now();
  struct dirent *epdf;
  DIR *dpdf = opendir("./");

  if (NULL not_eq dpdf) {
    epdf = readdir(dpdf);

    while (epdf) {
      if (DT_REG == epdf->d_type) {
        std::string name = epdf->d_name;
        std::string ext = name.substr();
        auto pos = name.find(".");

        if ((pos not_eq std::string::npos) and (".log" == ext)) {
          struct stat t_stat;
          stat(name.c_str(), &t_stat);
          struct tm *file_time = localtime(&t_stat.st_ctime);
          auto mod = std::chrono::system_clock::from_time_t(mktime(file_time));

          if (mod + std::chrono::hours(_log_file_depth) < now) {
            if (0 not_eq remove(name.c_str())) {
              std::runtime_error("LOG ERROR: can`t remove file `" + name + "`.");
            }
          }
        }
      }
      epdf = readdir(dpdf);
    }
  }
  ++_file_number;
}


void Log::print(const Log::Level &level, const std::string &module, const std::string &message) {
  std::unique_lock<std::mutex> lock(_mutex);

  if (_is_run) {
    auto now = std::chrono::system_clock::now();
    auto duration = now.time_since_epoch();
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();

    if (_queue.size() < LOG_MAX_QUEUE_SIZE) {
      _queue.push(std::make_tuple(level, module, message, millis));
    }
    else {
      std::string err_msg = "Log max queue size exceeded! " + std::to_string(_queue.size()) + " messages were dropped.";
      Queue q;
      _queue.swap(q);
      _queue.push(std::make_tuple(ERROR, "NONE", err_msg, millis));
    }
    _cond.notify_one();
  }
}


void Log::start() {
  if (_thread) {
    stop();
  }
  auto exec_func = std::bind(&Log::execute, this);
  _is_run = true;
  _thread.reset(new std::thread(exec_func));
}


void Log::stop() {
  {
    std::unique_lock<std::mutex> lock(_mutex);
    _is_run = false;
  }
  _cond.notify_one();

  if (_thread) {
    _thread->join();
    _thread.reset();
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


LogSequence::Head::Next::Next(const Next &next)
  : _stream(next._stream)
{}


LogSequence::Head::Head(const Head &head)
  : _stream(head._stream)
  , _level(head._level)
  , _module(head._module)
{}


LogSequence::LogSequence(const Log::Level &level, const std::string &module)
  : _level(level)
  , _module(module)
{}
