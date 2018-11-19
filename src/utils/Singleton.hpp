/*!
 * \brief  Потокозащищённая обёртка для уникального объекта.
 * \author R.N.Velichko rostislav.vel@gmail.com
 * \date   02.03.2013
 */

#pragma once

#include <memory>
#include <thread>
#include <mutex>

#include <boost/noncopyable.hpp>


namespace arobot {
namespace utils {

template<class T>
class Singleton : private boost::noncopyable
{
public:
  static T* get() {
    static std::shared_ptr<T> _only_one_instance;
    static std::mutex _mutex;

    if (not _only_one_instance.get()) {
      std::lock_guard<std::mutex> lock(_mutex);

      if (not _only_one_instance) {
        _only_one_instance.reset(new T());
      }
    }
    return _only_one_instance.get();
  }
};
} // utils
} // arobot
