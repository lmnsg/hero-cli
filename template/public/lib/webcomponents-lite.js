/**
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
// @version 0.7.24
(function() {
  window.WebComponents = window.WebComponents || {
    flags: {}
  }
  let file = 'webcomponents-lite.js'
  let script = document.querySelector('script[src*="' + file + '"]')
  let flags = {}
  if (!flags.noOpts) {
    location.search.slice(1).split('&').forEach(function(option) {
      let parts = option.split('=')
      let match
      if (parts[0] && (match = parts[0].match(/wc-(.+)/))) {
        flags[match[1]] = parts[1] || true
      }
    })
    if (script) {
      for (var i = 0, a; a = script.attributes[i]; i++) {
        if (a.name !== 'src') {
          flags[a.name] = a.value || true
        }
      }
    }
    if (flags.log && flags.log.split) {
      let parts = flags.log.split(',')
      flags.log = {}
      parts.forEach(function(f) {
        flags.log[f] = true
      })
    } else {
      flags.log = {}
    }
  }
  if (flags.register) {
    window.CustomElements = window.CustomElements || {
      flags: {}
    }
    window.CustomElements.flags.register = flags.register
  }
  WebComponents.flags = flags
})();

(function(scope) {
  let hasWorkingUrl = false
  if (!scope.forceJURL) {
    try {
      let u = new URL('b', 'http://a')
      u.pathname = 'c%20d'
      hasWorkingUrl = u.href === 'http://a/c%20d'
    } catch (e) {}
  }
  if (hasWorkingUrl) return
  let relative = Object.create(null)
  relative['ftp'] = 21
  relative['file'] = 0
  relative['gopher'] = 70
  relative['http'] = 80
  relative['https'] = 443
  relative['ws'] = 80
  relative['wss'] = 443
  let relativePathDotMapping = Object.create(null)
  relativePathDotMapping['%2e'] = '.'
  relativePathDotMapping['.%2e'] = '..'
  relativePathDotMapping['%2e.'] = '..'
  relativePathDotMapping['%2e%2e'] = '..'
  function isRelativeScheme(scheme) {
    return relative[scheme] !== undefined
  }
  function invalid() {
    clear.call(this)
    this._isInvalid = true
  }
  function IDNAToASCII(h) {
    if (h == '') {
      invalid.call(this)
    }
    return h.toLowerCase()
  }
  function percentEscape(c) {
    let unicode = c.charCodeAt(0)
    if (unicode > 32 && unicode < 127 && [ 34, 35, 60, 62, 63, 96 ].indexOf(unicode) == -1) {
      return c
    }
    return encodeURIComponent(c)
  }
  function percentEscapeQuery(c) {
    let unicode = c.charCodeAt(0)
    if (unicode > 32 && unicode < 127 && [ 34, 35, 60, 62, 96 ].indexOf(unicode) == -1) {
      return c
    }
    return encodeURIComponent(c)
  }
  let EOF, ALPHA = /[a-zA-Z]/, ALPHANUMERIC = /[a-zA-Z0-9\+\-\.]/
  function parse(input, stateOverride, base) {
    function err(message) {
      errors.push(message)
    }
    var state = stateOverride || 'scheme start', cursor = 0, buffer = '', seenAt = false, seenBracket = false, errors = []
    loop: while ((input[cursor - 1] != EOF || cursor == 0) && !this._isInvalid) {
      let c = input[cursor]
      switch (state) {
        case 'scheme start':
          if (c && ALPHA.test(c)) {
            buffer += c.toLowerCase()
            state = 'scheme'
          } else if (!stateOverride) {
            buffer = ''
            state = 'no scheme'
            continue
          } else {
            err('Invalid scheme.')
            break loop
          }
          break

        case 'scheme':
          if (c && ALPHANUMERIC.test(c)) {
            buffer += c.toLowerCase()
          } else if (c == ':') {
            this._scheme = buffer
            buffer = ''
            if (stateOverride) {
              break loop
            }
            if (isRelativeScheme(this._scheme)) {
              this._isRelative = true
            }
            if (this._scheme == 'file') {
              state = 'relative'
            } else if (this._isRelative && base && base._scheme == this._scheme) {
              state = 'relative or authority'
            } else if (this._isRelative) {
              state = 'authority first slash'
            } else {
              state = 'scheme data'
            }
          } else if (!stateOverride) {
            buffer = ''
            cursor = 0
            state = 'no scheme'
            continue
          } else if (EOF == c) {
            break loop
          } else {
            err('Code point not allowed in scheme: ' + c)
            break loop
          }
          break

        case 'scheme data':
          if (c == '?') {
            this._query = '?'
            state = 'query'
          } else if (c == '#') {
            this._fragment = '#'
            state = 'fragment'
          } else {
            if (EOF != c && c != '\t' && c != '\n' && c != '\r') {
              this._schemeData += percentEscape(c)
            }
          }
          break

        case 'no scheme':
          if (!base || !isRelativeScheme(base._scheme)) {
            err('Missing scheme.')
            invalid.call(this)
          } else {
            state = 'relative'
            continue
          }
          break

        case 'relative or authority':
          if (c == '/' && input[cursor + 1] == '/') {
            state = 'authority ignore slashes'
          } else {
            err('Expected /, got: ' + c)
            state = 'relative'
            continue
          }
          break

        case 'relative':
          this._isRelative = true
          if (this._scheme != 'file') this._scheme = base._scheme
          if (EOF == c) {
            this._host = base._host
            this._port = base._port
            this._path = base._path.slice()
            this._query = base._query
            this._username = base._username
            this._password = base._password
            break loop
          } else if (c == '/' || c == '\\') {
            if (c == '\\') err('\\ is an invalid code point.')
            state = 'relative slash'
          } else if (c == '?') {
            this._host = base._host
            this._port = base._port
            this._path = base._path.slice()
            this._query = '?'
            this._username = base._username
            this._password = base._password
            state = 'query'
          } else if (c == '#') {
            this._host = base._host
            this._port = base._port
            this._path = base._path.slice()
            this._query = base._query
            this._fragment = '#'
            this._username = base._username
            this._password = base._password
            state = 'fragment'
          } else {
            let nextC = input[cursor + 1]
            let nextNextC = input[cursor + 2]
            if (this._scheme != 'file' || !ALPHA.test(c) || nextC != ':' && nextC != '|' || EOF != nextNextC && nextNextC != '/' && nextNextC != '\\' && nextNextC != '?' && nextNextC != '#') {
              this._host = base._host
              this._port = base._port
              this._username = base._username
              this._password = base._password
              this._path = base._path.slice()
              this._path.pop()
            }
            state = 'relative path'
            continue
          }
          break

        case 'relative slash':
          if (c == '/' || c == '\\') {
            if (c == '\\') {
              err('\\ is an invalid code point.')
            }
            if (this._scheme == 'file') {
              state = 'file host'
            } else {
              state = 'authority ignore slashes'
            }
          } else {
            if (this._scheme != 'file') {
              this._host = base._host
              this._port = base._port
              this._username = base._username
              this._password = base._password
            }
            state = 'relative path'
            continue
          }
          break

        case 'authority first slash':
          if (c == '/') {
            state = 'authority second slash'
          } else {
            err("Expected '/', got: " + c)
            state = 'authority ignore slashes'
            continue
          }
          break

        case 'authority second slash':
          state = 'authority ignore slashes'
          if (c != '/') {
            err("Expected '/', got: " + c)
            continue
          }
          break

        case 'authority ignore slashes':
          if (c != '/' && c != '\\') {
            state = 'authority'
            continue
          } else {
            err('Expected authority, got: ' + c)
          }
          break

        case 'authority':
          if (c == '@') {
            if (seenAt) {
              err('@ already seen.')
              buffer += '%40'
            }
            seenAt = true
            for (let i = 0; i < buffer.length; i++) {
              let cp = buffer[i]
              if (cp == '\t' || cp == '\n' || cp == '\r') {
                err('Invalid whitespace in authority.')
                continue
              }
              if (cp == ':' && this._password === null) {
                this._password = ''
                continue
              }
              let tempC = percentEscape(cp)
              this._password !== null ? this._password += tempC : this._username += tempC
            }
            buffer = ''
          } else if (EOF == c || c == '/' || c == '\\' || c == '?' || c == '#') {
            cursor -= buffer.length
            buffer = ''
            state = 'host'
            continue
          } else {
            buffer += c
          }
          break

        case 'file host':
          if (EOF == c || c == '/' || c == '\\' || c == '?' || c == '#') {
            if (buffer.length == 2 && ALPHA.test(buffer[0]) && (buffer[1] == ':' || buffer[1] == '|')) {
              state = 'relative path'
            } else if (buffer.length == 0) {
              state = 'relative path start'
            } else {
              this._host = IDNAToASCII.call(this, buffer)
              buffer = ''
              state = 'relative path start'
            }
            continue
          } else if (c == '\t' || c == '\n' || c == '\r') {
            err('Invalid whitespace in file host.')
          } else {
            buffer += c
          }
          break

        case 'host':
        case 'hostname':
          if (c == ':' && !seenBracket) {
            this._host = IDNAToASCII.call(this, buffer)
            buffer = ''
            state = 'port'
            if (stateOverride == 'hostname') {
              break loop
            }
          } else if (EOF == c || c == '/' || c == '\\' || c == '?' || c == '#') {
            this._host = IDNAToASCII.call(this, buffer)
            buffer = ''
            state = 'relative path start'
            if (stateOverride) {
              break loop
            }
            continue
          } else if (c != '\t' && c != '\n' && c != '\r') {
            if (c == '[') {
              seenBracket = true
            } else if (c == ']') {
              seenBracket = false
            }
            buffer += c
          } else {
            err('Invalid code point in host/hostname: ' + c)
          }
          break

        case 'port':
          if (/[0-9]/.test(c)) {
            buffer += c
          } else if (EOF == c || c == '/' || c == '\\' || c == '?' || c == '#' || stateOverride) {
            if (buffer != '') {
              let temp = parseInt(buffer, 10)
              if (temp != relative[this._scheme]) {
                this._port = temp + ''
              }
              buffer = ''
            }
            if (stateOverride) {
              break loop
            }
            state = 'relative path start'
            continue
          } else if (c == '\t' || c == '\n' || c == '\r') {
            err('Invalid code point in port: ' + c)
          } else {
            invalid.call(this)
          }
          break

        case 'relative path start':
          if (c == '\\') err("'\\' not allowed in path.")
          state = 'relative path'
          if (c != '/' && c != '\\') {
            continue
          }
          break

        case 'relative path':
          if (EOF == c || c == '/' || c == '\\' || !stateOverride && (c == '?' || c == '#')) {
            if (c == '\\') {
              err('\\ not allowed in relative path.')
            }
            var tmp
            if (tmp = relativePathDotMapping[buffer.toLowerCase()]) {
              buffer = tmp
            }
            if (buffer == '..') {
              this._path.pop()
              if (c != '/' && c != '\\') {
                this._path.push('')
              }
            } else if (buffer == '.' && c != '/' && c != '\\') {
              this._path.push('')
            } else if (buffer != '.') {
              if (this._scheme == 'file' && this._path.length == 0 && buffer.length == 2 && ALPHA.test(buffer[0]) && buffer[1] == '|') {
                buffer = buffer[0] + ':'
              }
              this._path.push(buffer)
            }
            buffer = ''
            if (c == '?') {
              this._query = '?'
              state = 'query'
            } else if (c == '#') {
              this._fragment = '#'
              state = 'fragment'
            }
          } else if (c != '\t' && c != '\n' && c != '\r') {
            buffer += percentEscape(c)
          }
          break

        case 'query':
          if (!stateOverride && c == '#') {
            this._fragment = '#'
            state = 'fragment'
          } else if (EOF != c && c != '\t' && c != '\n' && c != '\r') {
            this._query += percentEscapeQuery(c)
          }
          break

        case 'fragment':
          if (EOF != c && c != '\t' && c != '\n' && c != '\r') {
            this._fragment += c
          }
          break
      }
      cursor++
    }
  }
  function clear() {
    this._scheme = ''
    this._schemeData = ''
    this._username = ''
    this._password = null
    this._host = ''
    this._port = ''
    this._path = []
    this._query = ''
    this._fragment = ''
    this._isInvalid = false
    this._isRelative = false
  }
  function jURL(url, base) {
    if (base !== undefined && !(base instanceof jURL)) base = new jURL(String(base))
    this._url = url
    clear.call(this)
    let input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g, '')
    parse.call(this, input, null, base)
  }
  jURL.prototype = {
    toString: function() {
      return this.href
    },
    get href() {
      if (this._isInvalid) return this._url
      let authority = ''
      if (this._username != '' || this._password != null) {
        authority = this._username + (this._password != null ? ':' + this._password : '') + '@'
      }
      return this.protocol + (this._isRelative ? '//' + authority + this.host : '') + this.pathname + this._query + this._fragment
    },
    set href(href) {
      clear.call(this)
      parse.call(this, href)
    },
    get protocol() {
      return this._scheme + ':'
    },
    set protocol(protocol) {
      if (this._isInvalid) return
      parse.call(this, protocol + ':', 'scheme start')
    },
    get host() {
      return this._isInvalid ? '' : this._port ? this._host + ':' + this._port : this._host
    },
    set host(host) {
      if (this._isInvalid || !this._isRelative) return
      parse.call(this, host, 'host')
    },
    get hostname() {
      return this._host
    },
    set hostname(hostname) {
      if (this._isInvalid || !this._isRelative) return
      parse.call(this, hostname, 'hostname')
    },
    get port() {
      return this._port
    },
    set port(port) {
      if (this._isInvalid || !this._isRelative) return
      parse.call(this, port, 'port')
    },
    get pathname() {
      return this._isInvalid ? '' : this._isRelative ? '/' + this._path.join('/') : this._schemeData
    },
    set pathname(pathname) {
      if (this._isInvalid || !this._isRelative) return
      this._path = []
      parse.call(this, pathname, 'relative path start')
    },
    get search() {
      return this._isInvalid || !this._query || this._query == '?' ? '' : this._query
    },
    set search(search) {
      if (this._isInvalid || !this._isRelative) return
      this._query = '?'
      if (search[0] == '?') search = search.slice(1)
      parse.call(this, search, 'query')
    },
    get hash() {
      return this._isInvalid || !this._fragment || this._fragment == '#' ? '' : this._fragment
    },
    set hash(hash) {
      if (this._isInvalid) return
      this._fragment = '#'
      if (hash[0] == '#') hash = hash.slice(1)
      parse.call(this, hash, 'fragment')
    },
    get origin() {
      let host
      if (this._isInvalid || !this._scheme) {
        return ''
      }
      switch (this._scheme) {
        case 'data':
        case 'file':
        case 'javascript':
        case 'mailto':
          return 'null'
      }
      host = this.host
      if (!host) {
        return ''
      }
      return this._scheme + '://' + host
    }
  }
  let OriginalURL = scope.URL
  if (OriginalURL) {
    jURL.createObjectURL = function(blob) {
      return OriginalURL.createObjectURL.apply(OriginalURL, arguments)
    }
    jURL.revokeObjectURL = function(url) {
      OriginalURL.revokeObjectURL(url)
    }
  }
  scope.URL = jURL
})(self)

if (typeof WeakMap === 'undefined') {
  (function() {
    let defineProperty = Object.defineProperty
    let counter = Date.now() % 1e9
    let WeakMap = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__')
    }
    WeakMap.prototype = {
      set: function(key, value) {
        let entry = key[this.name]
        if (entry && entry[0] === key) entry[1] = value; else {
          defineProperty(key, this.name, {
            value: [ key, value ],
            writable: true
          })
        }
        return this
      },
      get: function(key) {
        let entry
        return (entry = key[this.name]) && entry[0] === key ? entry[1] : undefined
      },
      'delete': function(key) {
        let entry = key[this.name]
        if (!entry || entry[0] !== key) return false
        entry[0] = entry[1] = undefined
        return true
      },
      has: function(key) {
        let entry = key[this.name]
        if (!entry) return false
        return entry[0] === key
      }
    }
    window.WeakMap = WeakMap
  })()
}

(function(global) {
  if (global.JsMutationObserver) {
    return
  }
  let registrationsTable = new WeakMap()
  let setImmediate
  if (/Trident|Edge/.test(navigator.userAgent)) {
    setImmediate = setTimeout
  } else if (window.setImmediate) {
    setImmediate = window.setImmediate
  } else {
    let setImmediateQueue = []
    let sentinel = String(Math.random())
    window.addEventListener('message', function(e) {
      if (e.data === sentinel) {
        let queue = setImmediateQueue
        setImmediateQueue = []
        queue.forEach(function(func) {
          func()
        })
      }
    })
    setImmediate = function(func) {
      setImmediateQueue.push(func)
      window.postMessage(sentinel, '*')
    }
  }
  let isScheduled = false
  let scheduledObservers = []
  function scheduleCallback(observer) {
    scheduledObservers.push(observer)
    if (!isScheduled) {
      isScheduled = true
      setImmediate(dispatchCallbacks)
    }
  }
  function wrapIfNeeded(node) {
    return window.ShadowDOMPolyfill && window.ShadowDOMPolyfill.wrapIfNeeded(node) || node
  }
  function dispatchCallbacks() {
    isScheduled = false
    let observers = scheduledObservers
    scheduledObservers = []
    observers.sort(function(o1, o2) {
      return o1.uid_ - o2.uid_
    })
    let anyNonEmpty = false
    observers.forEach(function(observer) {
      let queue = observer.takeRecords()
      removeTransientObserversFor(observer)
      if (queue.length) {
        observer.callback_(queue, observer)
        anyNonEmpty = true
      }
    })
    if (anyNonEmpty) dispatchCallbacks()
  }
  function removeTransientObserversFor(observer) {
    observer.nodes_.forEach(function(node) {
      let registrations = registrationsTable.get(node)
      if (!registrations) return
      registrations.forEach(function(registration) {
        if (registration.observer === observer) registration.removeTransientObservers()
      })
    })
  }
  function forEachAncestorAndObserverEnqueueRecord(target, callback) {
    for (let node = target; node; node = node.parentNode) {
      let registrations = registrationsTable.get(node)
      if (registrations) {
        for (let j = 0; j < registrations.length; j++) {
          let registration = registrations[j]
          let options = registration.options
          if (node !== target && !options.subtree) continue
          let record = callback(options)
          if (record) registration.enqueue(record)
        }
      }
    }
  }
  let uidCounter = 0
  function JsMutationObserver(callback) {
    this.callback_ = callback
    this.nodes_ = []
    this.records_ = []
    this.uid_ = ++uidCounter
  }
  JsMutationObserver.prototype = {
    observe: function(target, options) {
      target = wrapIfNeeded(target)
      if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
        throw new SyntaxError()
      }
      let registrations = registrationsTable.get(target)
      if (!registrations) registrationsTable.set(target, registrations = [])
      let registration
      for (let i = 0; i < registrations.length; i++) {
        if (registrations[i].observer === this) {
          registration = registrations[i]
          registration.removeListeners()
          registration.options = options
          break
        }
      }
      if (!registration) {
        registration = new Registration(this, target, options)
        registrations.push(registration)
        this.nodes_.push(target)
      }
      registration.addListeners()
    },
    disconnect: function() {
      this.nodes_.forEach(function(node) {
        let registrations = registrationsTable.get(node)
        for (let i = 0; i < registrations.length; i++) {
          let registration = registrations[i]
          if (registration.observer === this) {
            registration.removeListeners()
            registrations.splice(i, 1)
            break
          }
        }
      }, this)
      this.records_ = []
    },
    takeRecords: function() {
      let copyOfRecords = this.records_
      this.records_ = []
      return copyOfRecords
    }
  }
  function MutationRecord(type, target) {
    this.type = type
    this.target = target
    this.addedNodes = []
    this.removedNodes = []
    this.previousSibling = null
    this.nextSibling = null
    this.attributeName = null
    this.attributeNamespace = null
    this.oldValue = null
  }
  function copyMutationRecord(original) {
    let record = new MutationRecord(original.type, original.target)
    record.addedNodes = original.addedNodes.slice()
    record.removedNodes = original.removedNodes.slice()
    record.previousSibling = original.previousSibling
    record.nextSibling = original.nextSibling
    record.attributeName = original.attributeName
    record.attributeNamespace = original.attributeNamespace
    record.oldValue = original.oldValue
    return record
  }
  let currentRecord, recordWithOldValue
  function getRecord(type, target) {
    return currentRecord = new MutationRecord(type, target)
  }
  function getRecordWithOldValue(oldValue) {
    if (recordWithOldValue) return recordWithOldValue
    recordWithOldValue = copyMutationRecord(currentRecord)
    recordWithOldValue.oldValue = oldValue
    return recordWithOldValue
  }
  function clearRecords() {
    currentRecord = recordWithOldValue = undefined
  }
  function recordRepresentsCurrentMutation(record) {
    return record === recordWithOldValue || record === currentRecord
  }
  function selectRecord(lastRecord, newRecord) {
    if (lastRecord === newRecord) return lastRecord
    if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord)) return recordWithOldValue
    return null
  }
  function Registration(observer, target, options) {
    this.observer = observer
    this.target = target
    this.options = options
    this.transientObservedNodes = []
  }
  Registration.prototype = {
    enqueue: function(record) {
      let records = this.observer.records_
      let length = records.length
      if (records.length > 0) {
        let lastRecord = records[length - 1]
        let recordToReplaceLast = selectRecord(lastRecord, record)
        if (recordToReplaceLast) {
          records[length - 1] = recordToReplaceLast
          return
        }
      } else {
        scheduleCallback(this.observer)
      }
      records[length] = record
    },
    addListeners: function() {
      this.addListeners_(this.target)
    },
    addListeners_: function(node) {
      let options = this.options
      if (options.attributes) node.addEventListener('DOMAttrModified', this, true)
      if (options.characterData) node.addEventListener('DOMCharacterDataModified', this, true)
      if (options.childList) node.addEventListener('DOMNodeInserted', this, true)
      if (options.childList || options.subtree) node.addEventListener('DOMNodeRemoved', this, true)
    },
    removeListeners: function() {
      this.removeListeners_(this.target)
    },
    removeListeners_: function(node) {
      let options = this.options
      if (options.attributes) node.removeEventListener('DOMAttrModified', this, true)
      if (options.characterData) node.removeEventListener('DOMCharacterDataModified', this, true)
      if (options.childList) node.removeEventListener('DOMNodeInserted', this, true)
      if (options.childList || options.subtree) node.removeEventListener('DOMNodeRemoved', this, true)
    },
    addTransientObserver: function(node) {
      if (node === this.target) return
      this.addListeners_(node)
      this.transientObservedNodes.push(node)
      let registrations = registrationsTable.get(node)
      if (!registrations) registrationsTable.set(node, registrations = [])
      registrations.push(this)
    },
    removeTransientObservers: function() {
      let transientObservedNodes = this.transientObservedNodes
      this.transientObservedNodes = []
      transientObservedNodes.forEach(function(node) {
        this.removeListeners_(node)
        let registrations = registrationsTable.get(node)
        for (let i = 0; i < registrations.length; i++) {
          if (registrations[i] === this) {
            registrations.splice(i, 1)
            break
          }
        }
      }, this)
    },
    handleEvent: function(e) {
      e.stopImmediatePropagation()
      switch (e.type) {
        case 'DOMAttrModified':
          var name = e.attrName
          var namespace = e.relatedNode.namespaceURI
          var target = e.target
          var record = new getRecord('attributes', target)
          record.attributeName = name
          record.attributeNamespace = namespace
          var oldValue = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue
          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            if (!options.attributes) return
            if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
              return
            }
            if (options.attributeOldValue) return getRecordWithOldValue(oldValue)
            return record
          })
          break

        case 'DOMCharacterDataModified':
          var target = e.target
          var record = getRecord('characterData', target)
          var oldValue = e.prevValue
          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            if (!options.characterData) return
            if (options.characterDataOldValue) return getRecordWithOldValue(oldValue)
            return record
          })
          break

        case 'DOMNodeRemoved':
          this.addTransientObserver(e.target)

        case 'DOMNodeInserted':
          var changedNode = e.target
          var addedNodes, removedNodes
          if (e.type === 'DOMNodeInserted') {
            addedNodes = [ changedNode ]
            removedNodes = []
          } else {
            addedNodes = []
            removedNodes = [ changedNode ]
          }
          var previousSibling = changedNode.previousSibling
          var nextSibling = changedNode.nextSibling
          var record = getRecord('childList', e.target.parentNode)
          record.addedNodes = addedNodes
          record.removedNodes = removedNodes
          record.previousSibling = previousSibling
          record.nextSibling = nextSibling
          forEachAncestorAndObserverEnqueueRecord(e.relatedNode, function(options) {
            if (!options.childList) return
            return record
          })
      }
      clearRecords()
    }
  }
  global.JsMutationObserver = JsMutationObserver
  if (!global.MutationObserver) {
    global.MutationObserver = JsMutationObserver
    JsMutationObserver._isPolyfilled = true
  }
})(self);

(function() {
  let needsTemplate = typeof HTMLTemplateElement === 'undefined'
  if (/Trident/.test(navigator.userAgent)) {
    (function() {
      let importNode = document.importNode
      document.importNode = function() {
        let n = importNode.apply(document, arguments)
        if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
          let f = document.createDocumentFragment()
          f.appendChild(n)
          return f
        } else {
          return n
        }
      }
    })()
  }
  let needsCloning = (function() {
    if (!needsTemplate) {
      let t = document.createElement('template')
      let t2 = document.createElement('template')
      t2.content.appendChild(document.createElement('div'))
      t.content.appendChild(t2)
      let clone = t.cloneNode(true)
      return clone.content.childNodes.length === 0 || clone.content.firstChild.content.childNodes.length === 0
    }
  }())
  let TEMPLATE_TAG = 'template'
  let TemplateImpl = function() {}
  if (needsTemplate) {
    let contentDoc = document.implementation.createHTMLDocument('template')
    let canDecorate = true
    let templateStyle = document.createElement('style')
    templateStyle.textContent = TEMPLATE_TAG + '{display:none;}'
    let head = document.head
    head.insertBefore(templateStyle, head.firstElementChild)
    TemplateImpl.prototype = Object.create(HTMLElement.prototype)
    TemplateImpl.decorate = function(template) {
      if (template.content) {
        return
      }
      template.content = contentDoc.createDocumentFragment()
      let child
      while (child = template.firstChild) {
        template.content.appendChild(child)
      }
      template.cloneNode = function(deep) {
        return TemplateImpl.cloneNode(this, deep)
      }
      if (canDecorate) {
        try {
          Object.defineProperty(template, 'innerHTML', {
            get: function() {
              let o = ''
              for (let e = this.content.firstChild; e; e = e.nextSibling) {
                o += e.outerHTML || escapeData(e.data)
              }
              return o
            },
            set: function(text) {
              contentDoc.body.innerHTML = text
              TemplateImpl.bootstrap(contentDoc)
              while (this.content.firstChild) {
                this.content.removeChild(this.content.firstChild)
              }
              while (contentDoc.body.firstChild) {
                this.content.appendChild(contentDoc.body.firstChild)
              }
            },
            configurable: true
          })
        } catch (err) {
          canDecorate = false
        }
      }
      TemplateImpl.bootstrap(template.content)
    }
    TemplateImpl.bootstrap = function(doc) {
      let templates = doc.querySelectorAll(TEMPLATE_TAG)
      for (var i = 0, l = templates.length, t; i < l && (t = templates[i]); i++) {
        TemplateImpl.decorate(t)
      }
    }
    document.addEventListener('DOMContentLoaded', function() {
      TemplateImpl.bootstrap(document)
    })
    let createElement = document.createElement
    document.createElement = function() {
      let el = createElement.apply(document, arguments)
      if (el.localName === 'template') {
        TemplateImpl.decorate(el)
      }
      return el
    }
    let escapeDataRegExp = /[&\u00A0<>]/g
    function escapeReplace(c) {
      switch (c) {
        case '&':
          return '&amp;'

        case '<':
          return '&lt;'

        case '>':
          return '&gt;'

        case ' ':
          return '&nbsp;'
      }
    }
    function escapeData(s) {
      return s.replace(escapeDataRegExp, escapeReplace)
    }
  }
  if (needsTemplate || needsCloning) {
    let nativeCloneNode = Node.prototype.cloneNode
    TemplateImpl.cloneNode = function(template, deep) {
      let clone = nativeCloneNode.call(template, false)
      if (this.decorate) {
        this.decorate(clone)
      }
      if (deep) {
        clone.content.appendChild(nativeCloneNode.call(template.content, true))
        this.fixClonedDom(clone.content, template.content)
      }
      return clone
    }
    TemplateImpl.fixClonedDom = function(clone, source) {
      if (!source.querySelectorAll) return
      let s$ = source.querySelectorAll(TEMPLATE_TAG)
      let t$ = clone.querySelectorAll(TEMPLATE_TAG)
      for (var i = 0, l = t$.length, t, s; i < l; i++) {
        s = s$[i]
        t = t$[i]
        if (this.decorate) {
          this.decorate(s)
        }
        t.parentNode.replaceChild(s.cloneNode(true), t)
      }
    }
    let originalImportNode = document.importNode
    Node.prototype.cloneNode = function(deep) {
      let dom = nativeCloneNode.call(this, deep)
      if (deep) {
        TemplateImpl.fixClonedDom(dom, this)
      }
      return dom
    }
    document.importNode = function(element, deep) {
      if (element.localName === TEMPLATE_TAG) {
        return TemplateImpl.cloneNode(element, deep)
      } else {
        let dom = originalImportNode.call(document, element, deep)
        if (deep) {
          TemplateImpl.fixClonedDom(dom, element)
        }
        return dom
      }
    }
    if (needsCloning) {
      HTMLTemplateElement.prototype.cloneNode = function(deep) {
        return TemplateImpl.cloneNode(this, deep)
      }
    }
  }
  if (needsTemplate) {
    window.HTMLTemplateElement = TemplateImpl
  }
})();

(function(scope) {
  if (!(window.performance && window.performance.now)) {
    let start = Date.now()
    window.performance = {
      now: function() {
        return Date.now() - start
      }
    }
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (function() {
      let nativeRaf = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame
      return nativeRaf ? function(callback) {
        return nativeRaf(function() {
          callback(performance.now())
        })
      } : function(callback) {
        return window.setTimeout(callback, 1e3 / 60)
      }
    }())
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (function() {
      return window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || function(id) {
        clearTimeout(id)
      }
    }())
  }
  let workingDefaultPrevented = (function() {
    let e = document.createEvent('Event')
    e.initEvent('foo', true, true)
    e.preventDefault()
    return e.defaultPrevented
  }())
  if (!workingDefaultPrevented) {
    let origPreventDefault = Event.prototype.preventDefault
    Event.prototype.preventDefault = function() {
      if (!this.cancelable) {
        return
      }
      origPreventDefault.call(this)
      Object.defineProperty(this, 'defaultPrevented', {
        get: function() {
          return true
        },
        configurable: true
      })
    }
  }
  let isIE = /Trident/.test(navigator.userAgent)
  if (!window.CustomEvent || isIE && typeof window.CustomEvent !== 'function') {
    window.CustomEvent = function(inType, params) {
      params = params || {}
      let e = document.createEvent('CustomEvent')
      e.initCustomEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable), params.detail)
      return e
    }
    window.CustomEvent.prototype = window.Event.prototype
  }
  if (!window.Event || isIE && typeof window.Event !== 'function') {
    let origEvent = window.Event
    window.Event = function(inType, params) {
      params = params || {}
      let e = document.createEvent('Event')
      e.initEvent(inType, Boolean(params.bubbles), Boolean(params.cancelable))
      return e
    }
    window.Event.prototype = origEvent.prototype
  }
})(window.WebComponents)

window.HTMLImports = window.HTMLImports || {
  flags: {}
};

(function(scope) {
  let IMPORT_LINK_TYPE = 'import'
  let useNative = Boolean(IMPORT_LINK_TYPE in document.createElement('link'))
  let hasShadowDOMPolyfill = Boolean(window.ShadowDOMPolyfill)
  let wrap = function(node) {
    return hasShadowDOMPolyfill ? window.ShadowDOMPolyfill.wrapIfNeeded(node) : node
  }
  let rootDocument = wrap(document)
  let currentScriptDescriptor = {
    get: function() {
      let script = window.HTMLImports.currentScript || document.currentScript || (document.readyState !== 'complete' ? document.scripts[document.scripts.length - 1] : null)
      return wrap(script)
    },
    configurable: true
  }
  Object.defineProperty(document, '_currentScript', currentScriptDescriptor)
  Object.defineProperty(rootDocument, '_currentScript', currentScriptDescriptor)
  let isIE = /Trident/.test(navigator.userAgent)
  function whenReady(callback, doc) {
    doc = doc || rootDocument
    whenDocumentReady(function() {
      watchImportsLoad(callback, doc)
    }, doc)
  }
  let requiredReadyState = isIE ? 'complete' : 'interactive'
  let READY_EVENT = 'readystatechange'
  function isDocumentReady(doc) {
    return doc.readyState === 'complete' || doc.readyState === requiredReadyState
  }
  function whenDocumentReady(callback, doc) {
    if (!isDocumentReady(doc)) {
      var checkReady = function() {
        if (doc.readyState === 'complete' || doc.readyState === requiredReadyState) {
          doc.removeEventListener(READY_EVENT, checkReady)
          whenDocumentReady(callback, doc)
        }
      }
      doc.addEventListener(READY_EVENT, checkReady)
    } else if (callback) {
      callback()
    }
  }
  function markTargetLoaded(event) {
    event.target.__loaded = true
  }
  function watchImportsLoad(callback, doc) {
    let imports = doc.querySelectorAll('link[rel=import]')
    let parsedCount = 0, importCount = imports.length, newImports = [], errorImports = []
    function checkDone() {
      if (parsedCount == importCount && callback) {
        callback({
          allImports: imports,
          loadedImports: newImports,
          errorImports: errorImports
        })
      }
    }
    function loadedImport(e) {
      markTargetLoaded(e)
      newImports.push(this)
      parsedCount++
      checkDone()
    }
    function errorLoadingImport(e) {
      errorImports.push(this)
      parsedCount++
      checkDone()
    }
    if (importCount) {
      for (var i = 0, imp; i < importCount && (imp = imports[i]); i++) {
        if (isImportLoaded(imp)) {
          newImports.push(this)
          parsedCount++
          checkDone()
        } else {
          imp.addEventListener('load', loadedImport)
          imp.addEventListener('error', errorLoadingImport)
        }
      }
    } else {
      checkDone()
    }
  }
  function isImportLoaded(link) {
    return useNative ? link.__loaded || link.import && link.import.readyState !== 'loading' : link.__importParsed
  }
  if (useNative) {
    new MutationObserver(function(mxns) {
      for (var i = 0, l = mxns.length, m; i < l && (m = mxns[i]); i++) {
        if (m.addedNodes) {
          handleImports(m.addedNodes)
        }
      }
    }).observe(document.head, {
      childList: true
    })
    function handleImports(nodes) {
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        if (isImport(n)) {
          handleImport(n)
        }
      }
    }
    function isImport(element) {
      return element.localName === 'link' && element.rel === 'import'
    }
    function handleImport(element) {
      let loaded = element.import
      if (loaded) {
        markTargetLoaded({
          target: element
        })
      } else {
        element.addEventListener('load', markTargetLoaded)
        element.addEventListener('error', markTargetLoaded)
      }
    }
    (function() {
      if (document.readyState === 'loading') {
        let imports = document.querySelectorAll('link[rel=import]')
        for (var i = 0, l = imports.length, imp; i < l && (imp = imports[i]); i++) {
          handleImport(imp)
        }
      }
    })()
  }
  whenReady(function(detail) {
    window.HTMLImports.ready = true
    window.HTMLImports.readyTime = new Date().getTime()
    let evt = rootDocument.createEvent('CustomEvent')
    evt.initCustomEvent('HTMLImportsLoaded', true, true, detail)
    rootDocument.dispatchEvent(evt)
  })
  scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE
  scope.useNative = useNative
  scope.rootDocument = rootDocument
  scope.whenReady = whenReady
  scope.isIE = isIE
})(window.HTMLImports);

(function(scope) {
  let modules = []
  let addModule = function(module) {
    modules.push(module)
  }
  let initializeModules = function() {
    modules.forEach(function(module) {
      module(scope)
    })
  }
  scope.addModule = addModule
  scope.initializeModules = initializeModules
})(window.HTMLImports)

window.HTMLImports.addModule(function(scope) {
  let CSS_URL_REGEXP = /(url\()([^)]*)(\))/g
  let CSS_IMPORT_REGEXP = /(@import[\s]+(?!url\())([^;]*)(;)/g
  let path = {
    resolveUrlsInStyle: function(style, linkUrl) {
      let doc = style.ownerDocument
      let resolver = doc.createElement('a')
      style.textContent = this.resolveUrlsInCssText(style.textContent, linkUrl, resolver)
      return style
    },
    resolveUrlsInCssText: function(cssText, linkUrl, urlObj) {
      let r = this.replaceUrls(cssText, urlObj, linkUrl, CSS_URL_REGEXP)
      r = this.replaceUrls(r, urlObj, linkUrl, CSS_IMPORT_REGEXP)
      return r
    },
    replaceUrls: function(text, urlObj, linkUrl, regexp) {
      return text.replace(regexp, function(m, pre, url, post) {
        let urlPath = url.replace(/["']/g, '')
        if (linkUrl) {
          urlPath = new URL(urlPath, linkUrl).href
        }
        urlObj.href = urlPath
        urlPath = urlObj.href
        return pre + "'" + urlPath + "'" + post
      })
    }
  }
  scope.path = path
})

window.HTMLImports.addModule(function(scope) {
  var xhr = {
    async: true,
    ok: function(request) {
      return request.status >= 200 && request.status < 300 || request.status === 304 || request.status === 0
    },
    load: function(url, next, nextContext) {
      let request = new XMLHttpRequest()
      if (scope.flags.debug || scope.flags.bust) {
        url += '?' + Math.random()
      }
      request.open('GET', url, xhr.async)
      request.addEventListener('readystatechange', function(e) {
        if (request.readyState === 4) {
          let redirectedUrl = null
          try {
            let locationHeader = request.getResponseHeader('Location')
            if (locationHeader) {
              redirectedUrl = locationHeader.substr(0, 1) === '/' ? location.origin + locationHeader : locationHeader
            }
          } catch (e) {
            console.error(e.message)
          }
          next.call(nextContext, !xhr.ok(request) && request, request.response || request.responseText, redirectedUrl)
        }
      })
      request.send()
      return request
    },
    loadDocument: function(url, next, nextContext) {
      this.load(url, next, nextContext).responseType = 'document'
    }
  }
  scope.xhr = xhr
})

window.HTMLImports.addModule(function(scope) {
  let xhr = scope.xhr
  let flags = scope.flags
  let Loader = function(onLoad, onComplete) {
    this.cache = {}
    this.onload = onLoad
    this.oncomplete = onComplete
    this.inflight = 0
    this.pending = {}
  }
  Loader.prototype = {
    addNodes: function(nodes) {
      this.inflight += nodes.length
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        this.require(n)
      }
      this.checkDone()
    },
    addNode: function(node) {
      this.inflight++
      this.require(node)
      this.checkDone()
    },
    require: function(elt) {
      let url = elt.src || elt.href
      elt.__nodeUrl = url
      if (!this.dedupe(url, elt)) {
        this.fetch(url, elt)
      }
    },
    dedupe: function(url, elt) {
      if (this.pending[url]) {
        this.pending[url].push(elt)
        return true
      }
      let resource
      if (this.cache[url]) {
        this.onload(url, elt, this.cache[url])
        this.tail()
        return true
      }
      this.pending[url] = [ elt ]
      return false
    },
    fetch: function(url, elt) {
      flags.load && console.log('fetch', url, elt)
      if (!url) {
        setTimeout(function() {
          this.receive(url, elt, {
            error: 'href must be specified'
          }, null)
        }.bind(this), 0)
      } else if (url.match(/^data:/)) {
        let pieces = url.split(',')
        let header = pieces[0]
        let body = pieces[1]
        if (header.indexOf(';base64') > -1) {
          body = atob(body)
        } else {
          body = decodeURIComponent(body)
        }
        setTimeout(function() {
          this.receive(url, elt, null, body)
        }.bind(this), 0)
      } else {
        let receiveXhr = function(err, resource, redirectedUrl) {
          this.receive(url, elt, err, resource, redirectedUrl)
        }.bind(this)
        xhr.load(url, receiveXhr)
      }
    },
    receive: function(url, elt, err, resource, redirectedUrl) {
      this.cache[url] = resource
      let $p = this.pending[url]
      for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
        this.onload(url, p, resource, err, redirectedUrl)
        this.tail()
      }
      this.pending[url] = null
    },
    tail: function() {
      --this.inflight
      this.checkDone()
    },
    checkDone: function() {
      if (!this.inflight) {
        this.oncomplete()
      }
    }
  }
  scope.Loader = Loader
})

window.HTMLImports.addModule(function(scope) {
  let Observer = function(addCallback) {
    this.addCallback = addCallback
    this.mo = new MutationObserver(this.handler.bind(this))
  }
  Observer.prototype = {
    handler: function(mutations) {
      for (var i = 0, l = mutations.length, m; i < l && (m = mutations[i]); i++) {
        if (m.type === 'childList' && m.addedNodes.length) {
          this.addedNodes(m.addedNodes)
        }
      }
    },
    addedNodes: function(nodes) {
      if (this.addCallback) {
        this.addCallback(nodes)
      }
      for (var i = 0, l = nodes.length, n, loading; i < l && (n = nodes[i]); i++) {
        if (n.children && n.children.length) {
          this.addedNodes(n.children)
        }
      }
    },
    observe: function(root) {
      this.mo.observe(root, {
        childList: true,
        subtree: true
      })
    }
  }
  scope.Observer = Observer
})

window.HTMLImports.addModule(function(scope) {
  let path = scope.path
  let rootDocument = scope.rootDocument
  let flags = scope.flags
  let isIE = scope.isIE
  let IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE
  let IMPORT_SELECTOR = 'link[rel=' + IMPORT_LINK_TYPE + ']'
  let importParser = {
    documentSelectors: IMPORT_SELECTOR,
    importsSelectors: [ IMPORT_SELECTOR, 'link[rel=stylesheet]:not([type])', 'style:not([type])', 'script:not([type])', 'script[type="application/javascript"]', 'script[type="text/javascript"]' ].join(','),
    map: {
      link: 'parseLink',
      script: 'parseScript',
      style: 'parseStyle'
    },
    dynamicElements: [],
    parseNext: function() {
      let next = this.nextToParse()
      if (next) {
        this.parse(next)
      }
    },
    parse: function(elt) {
      if (this.isParsed(elt)) {
        flags.parse && console.log('[%s] is already parsed', elt.localName)
        return
      }
      let fn = this[this.map[elt.localName]]
      if (fn) {
        this.markParsing(elt)
        fn.call(this, elt)
      }
    },
    parseDynamic: function(elt, quiet) {
      this.dynamicElements.push(elt)
      if (!quiet) {
        this.parseNext()
      }
    },
    markParsing: function(elt) {
      flags.parse && console.log('parsing', elt)
      this.parsingElement = elt
    },
    markParsingComplete: function(elt) {
      elt.__importParsed = true
      this.markDynamicParsingComplete(elt)
      if (elt.__importElement) {
        elt.__importElement.__importParsed = true
        this.markDynamicParsingComplete(elt.__importElement)
      }
      this.parsingElement = null
      flags.parse && console.log('completed', elt)
    },
    markDynamicParsingComplete: function(elt) {
      let i = this.dynamicElements.indexOf(elt)
      if (i >= 0) {
        this.dynamicElements.splice(i, 1)
      }
    },
    parseImport: function(elt) {
      elt.import = elt.__doc
      if (window.HTMLImports.__importsParsingHook) {
        window.HTMLImports.__importsParsingHook(elt)
      }
      if (elt.import) {
        elt.import.__importParsed = true
      }
      this.markParsingComplete(elt)
      if (elt.__resource && !elt.__error) {
        elt.dispatchEvent(new CustomEvent('load', {
          bubbles: false
        }))
      } else {
        elt.dispatchEvent(new CustomEvent('error', {
          bubbles: false
        }))
      }
      if (elt.__pending) {
        let fn
        while (elt.__pending.length) {
          fn = elt.__pending.shift()
          if (fn) {
            fn({
              target: elt
            })
          }
        }
      }
      this.parseNext()
    },
    parseLink: function(linkElt) {
      if (nodeIsImport(linkElt)) {
        this.parseImport(linkElt)
      } else {
        linkElt.href = linkElt.href
        this.parseGeneric(linkElt)
      }
    },
    parseStyle: function(elt) {
      let src = elt
      elt = cloneStyle(elt)
      src.__appliedElement = elt
      elt.__importElement = src
      this.parseGeneric(elt)
    },
    parseGeneric: function(elt) {
      this.trackElement(elt)
      this.addElementToDocument(elt)
    },
    rootImportForElement: function(elt) {
      let n = elt
      while (n.ownerDocument.__importLink) {
        n = n.ownerDocument.__importLink
      }
      return n
    },
    addElementToDocument: function(elt) {
      let port = this.rootImportForElement(elt.__importElement || elt)
      port.parentNode.insertBefore(elt, port)
    },
    trackElement: function(elt, callback) {
      let self = this
      var done = function(e) {
        elt.removeEventListener('load', done)
        elt.removeEventListener('error', done)
        if (callback) {
          callback(e)
        }
        self.markParsingComplete(elt)
        self.parseNext()
      }
      elt.addEventListener('load', done)
      elt.addEventListener('error', done)
      if (isIE && elt.localName === 'style') {
        let fakeLoad = false
        if (elt.textContent.indexOf('@import') == -1) {
          fakeLoad = true
        } else if (elt.sheet) {
          fakeLoad = true
          let csr = elt.sheet.cssRules
          let len = csr ? csr.length : 0
          for (var i = 0, r; i < len && (r = csr[i]); i++) {
            if (r.type === CSSRule.IMPORT_RULE) {
              fakeLoad = fakeLoad && Boolean(r.styleSheet)
            }
          }
        }
        if (fakeLoad) {
          setTimeout(function() {
            elt.dispatchEvent(new CustomEvent('load', {
              bubbles: false
            }))
          })
        }
      }
    },
    parseScript: function(scriptElt) {
      let script = document.createElement('script')
      script.__importElement = scriptElt
      script.src = scriptElt.src ? scriptElt.src : generateScriptDataUrl(scriptElt)
      scope.currentScript = scriptElt
      this.trackElement(script, function(e) {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
        scope.currentScript = null
      })
      this.addElementToDocument(script)
    },
    nextToParse: function() {
      this._mayParse = []
      return !this.parsingElement && (this.nextToParseInDoc(rootDocument) || this.nextToParseDynamic())
    },
    nextToParseInDoc: function(doc, link) {
      if (doc && this._mayParse.indexOf(doc) < 0) {
        this._mayParse.push(doc)
        let nodes = doc.querySelectorAll(this.parseSelectorsForNode(doc))
        for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
          if (!this.isParsed(n)) {
            if (this.hasResource(n)) {
              return nodeIsImport(n) ? this.nextToParseInDoc(n.__doc, n) : n
            } else {
              return
            }
          }
        }
      }
      return link
    },
    nextToParseDynamic: function() {
      return this.dynamicElements[0]
    },
    parseSelectorsForNode: function(node) {
      let doc = node.ownerDocument || node
      return doc === rootDocument ? this.documentSelectors : this.importsSelectors
    },
    isParsed: function(node) {
      return node.__importParsed
    },
    needsDynamicParsing: function(elt) {
      return this.dynamicElements.indexOf(elt) >= 0
    },
    hasResource: function(node) {
      if (nodeIsImport(node) && node.__doc === undefined) {
        return false
      }
      return true
    }
  }
  function nodeIsImport(elt) {
    return elt.localName === 'link' && elt.rel === IMPORT_LINK_TYPE
  }
  function generateScriptDataUrl(script) {
    let scriptContent = generateScriptContent(script)
    return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(scriptContent)
  }
  function generateScriptContent(script) {
    return script.textContent + generateSourceMapHint(script)
  }
  function generateSourceMapHint(script) {
    let owner = script.ownerDocument
    owner.__importedScripts = owner.__importedScripts || 0
    let moniker = script.ownerDocument.baseURI
    let num = owner.__importedScripts ? '-' + owner.__importedScripts : ''
    owner.__importedScripts++
    return '\n//# sourceURL=' + moniker + num + '.js\n'
  }
  function cloneStyle(style) {
    let clone = style.ownerDocument.createElement('style')
    clone.textContent = style.textContent
    path.resolveUrlsInStyle(clone)
    return clone
  }
  scope.parser = importParser
  scope.IMPORT_SELECTOR = IMPORT_SELECTOR
})

window.HTMLImports.addModule(function(scope) {
  let flags = scope.flags
  let IMPORT_LINK_TYPE = scope.IMPORT_LINK_TYPE
  let IMPORT_SELECTOR = scope.IMPORT_SELECTOR
  let rootDocument = scope.rootDocument
  let Loader = scope.Loader
  let Observer = scope.Observer
  let parser = scope.parser
  let importer = {
    documents: {},
    documentPreloadSelectors: IMPORT_SELECTOR,
    importsPreloadSelectors: [ IMPORT_SELECTOR ].join(','),
    loadNode: function(node) {
      importLoader.addNode(node)
    },
    loadSubtree: function(parent) {
      let nodes = this.marshalNodes(parent)
      importLoader.addNodes(nodes)
    },
    marshalNodes: function(parent) {
      return parent.querySelectorAll(this.loadSelectorsForNode(parent))
    },
    loadSelectorsForNode: function(node) {
      let doc = node.ownerDocument || node
      return doc === rootDocument ? this.documentPreloadSelectors : this.importsPreloadSelectors
    },
    loaded: function(url, elt, resource, err, redirectedUrl) {
      flags.load && console.log('loaded', url, elt)
      elt.__resource = resource
      elt.__error = err
      if (isImportLink(elt)) {
        let doc = this.documents[url]
        if (doc === undefined) {
          doc = err ? null : makeDocument(resource, redirectedUrl || url)
          if (doc) {
            doc.__importLink = elt
            this.bootDocument(doc)
          }
          this.documents[url] = doc
        }
        elt.__doc = doc
      }
      parser.parseNext()
    },
    bootDocument: function(doc) {
      this.loadSubtree(doc)
      this.observer.observe(doc)
      parser.parseNext()
    },
    loadedAll: function() {
      parser.parseNext()
    }
  }
  var importLoader = new Loader(importer.loaded.bind(importer), importer.loadedAll.bind(importer))
  importer.observer = new Observer()
  function isImportLink(elt) {
    return isLinkRel(elt, IMPORT_LINK_TYPE)
  }
  function isLinkRel(elt, rel) {
    return elt.localName === 'link' && elt.getAttribute('rel') === rel
  }
  function hasBaseURIAccessor(doc) {
    return !!Object.getOwnPropertyDescriptor(doc, 'baseURI')
  }
  function makeDocument(resource, url) {
    let doc = document.implementation.createHTMLDocument(IMPORT_LINK_TYPE)
    doc._URL = url
    let base = doc.createElement('base')
    base.setAttribute('href', url)
    if (!doc.baseURI && !hasBaseURIAccessor(doc)) {
      Object.defineProperty(doc, 'baseURI', {
        value: url
      })
    }
    let meta = doc.createElement('meta')
    meta.setAttribute('charset', 'utf-8')
    doc.head.appendChild(meta)
    doc.head.appendChild(base)
    doc.body.innerHTML = resource
    if (window.HTMLTemplateElement && HTMLTemplateElement.bootstrap) {
      HTMLTemplateElement.bootstrap(doc)
    }
    return doc
  }
  if (!document.baseURI) {
    let baseURIDescriptor = {
      get: function() {
        let base = document.querySelector('base')
        return base ? base.href : window.location.href
      },
      configurable: true
    }
    Object.defineProperty(document, 'baseURI', baseURIDescriptor)
    Object.defineProperty(rootDocument, 'baseURI', baseURIDescriptor)
  }
  scope.importer = importer
  scope.importLoader = importLoader
})

window.HTMLImports.addModule(function(scope) {
  let parser = scope.parser
  let importer = scope.importer
  let dynamic = {
    added: function(nodes) {
      let owner, parsed, loading
      for (var i = 0, l = nodes.length, n; i < l && (n = nodes[i]); i++) {
        if (!owner) {
          owner = n.ownerDocument
          parsed = parser.isParsed(owner)
        }
        loading = this.shouldLoadNode(n)
        if (loading) {
          importer.loadNode(n)
        }
        if (this.shouldParseNode(n) && parsed) {
          parser.parseDynamic(n, loading)
        }
      }
    },
    shouldLoadNode: function(node) {
      return node.nodeType === 1 && matches.call(node, importer.loadSelectorsForNode(node))
    },
    shouldParseNode: function(node) {
      return node.nodeType === 1 && matches.call(node, parser.parseSelectorsForNode(node))
    }
  }
  importer.observer.addCallback = dynamic.added.bind(dynamic)
  var matches = HTMLElement.prototype.matches || HTMLElement.prototype.matchesSelector || HTMLElement.prototype.webkitMatchesSelector || HTMLElement.prototype.mozMatchesSelector || HTMLElement.prototype.msMatchesSelector
});

(function(scope) {
  let initializeModules = scope.initializeModules
  let isIE = scope.isIE
  if (scope.useNative) {
    return
  }
  initializeModules()
  let rootDocument = scope.rootDocument
  function bootstrap() {
    window.HTMLImports.importer.bootDocument(rootDocument)
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive' && !window.attachEvent) {
    bootstrap()
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap)
  }
})(window.HTMLImports)

window.CustomElements = window.CustomElements || {
  flags: {}
};

(function(scope) {
  let flags = scope.flags
  let modules = []
  let addModule = function(module) {
    modules.push(module)
  }
  let initializeModules = function() {
    modules.forEach(function(module) {
      module(scope)
    })
  }
  scope.addModule = addModule
  scope.initializeModules = initializeModules
  scope.hasNative = Boolean(document.registerElement)
  scope.isIE = /Trident/.test(navigator.userAgent)
  scope.useNative = !flags.register && scope.hasNative && !window.ShadowDOMPolyfill && (!window.HTMLImports || window.HTMLImports.useNative)
})(window.CustomElements)

window.CustomElements.addModule(function(scope) {
  let IMPORT_LINK_TYPE = window.HTMLImports ? window.HTMLImports.IMPORT_LINK_TYPE : 'none'
  function forSubtree(node, cb) {
    findAllElements(node, function(e) {
      if (cb(e)) {
        return true
      }
      forRoots(e, cb)
    })
    forRoots(node, cb)
  }
  function findAllElements(node, find, data) {
    let e = node.firstElementChild
    if (!e) {
      e = node.firstChild
      while (e && e.nodeType !== Node.ELEMENT_NODE) {
        e = e.nextSibling
      }
    }
    while (e) {
      if (find(e, data) !== true) {
        findAllElements(e, find, data)
      }
      e = e.nextElementSibling
    }
    return null
  }
  function forRoots(node, cb) {
    let root = node.shadowRoot
    while (root) {
      forSubtree(root, cb)
      root = root.olderShadowRoot
    }
  }
  function forDocumentTree(doc, cb) {
    _forDocumentTree(doc, cb, [])
  }
  function _forDocumentTree(doc, cb, processingDocuments) {
    doc = window.wrap(doc)
    if (processingDocuments.indexOf(doc) >= 0) {
      return
    }
    processingDocuments.push(doc)
    let imports = doc.querySelectorAll('link[rel=' + IMPORT_LINK_TYPE + ']')
    for (var i = 0, l = imports.length, n; i < l && (n = imports[i]); i++) {
      if (n.import) {
        _forDocumentTree(n.import, cb, processingDocuments)
      }
    }
    cb(doc)
  }
  scope.forDocumentTree = forDocumentTree
  scope.forSubtree = forSubtree
})

window.CustomElements.addModule(function(scope) {
  let flags = scope.flags
  let forSubtree = scope.forSubtree
  let forDocumentTree = scope.forDocumentTree
  function addedNode(node, isAttached) {
    return added(node, isAttached) || addedSubtree(node, isAttached)
  }
  function added(node, isAttached) {
    if (scope.upgrade(node, isAttached)) {
      return true
    }
    if (isAttached) {
      attached(node)
    }
  }
  function addedSubtree(node, isAttached) {
    forSubtree(node, function(e) {
      if (added(e, isAttached)) {
        return true
      }
    })
  }
  let hasThrottledAttached = window.MutationObserver._isPolyfilled && flags['throttle-attached']
  scope.hasPolyfillMutations = hasThrottledAttached
  scope.hasThrottledAttached = hasThrottledAttached
  let isPendingMutations = false
  let pendingMutations = []
  function deferMutation(fn) {
    pendingMutations.push(fn)
    if (!isPendingMutations) {
      isPendingMutations = true
      setTimeout(takeMutations)
    }
  }
  function takeMutations() {
    isPendingMutations = false
    let $p = pendingMutations
    for (var i = 0, l = $p.length, p; i < l && (p = $p[i]); i++) {
      p()
    }
    pendingMutations = []
  }
  function attached(element) {
    if (hasThrottledAttached) {
      deferMutation(function() {
        _attached(element)
      })
    } else {
      _attached(element)
    }
  }
  function _attached(element) {
    if (element.__upgraded__ && !element.__attached) {
      element.__attached = true
      if (element.attachedCallback) {
        element.attachedCallback()
      }
    }
  }
  function detachedNode(node) {
    detached(node)
    forSubtree(node, function(e) {
      detached(e)
    })
  }
  function detached(element) {
    if (hasThrottledAttached) {
      deferMutation(function() {
        _detached(element)
      })
    } else {
      _detached(element)
    }
  }
  function _detached(element) {
    if (element.__upgraded__ && element.__attached) {
      element.__attached = false
      if (element.detachedCallback) {
        element.detachedCallback()
      }
    }
  }
  function inDocument(element) {
    let p = element
    let doc = window.wrap(document)
    while (p) {
      if (p == doc) {
        return true
      }
      p = p.parentNode || p.nodeType === Node.DOCUMENT_FRAGMENT_NODE && p.host
    }
  }
  function watchShadow(node) {
    if (node.shadowRoot && !node.shadowRoot.__watched) {
      flags.dom && console.log('watching shadow-root for: ', node.localName)
      let root = node.shadowRoot
      while (root) {
        observe(root)
        root = root.olderShadowRoot
      }
    }
  }
  function handler(root, mutations) {
    if (flags.dom) {
      let mx = mutations[0]
      if (mx && mx.type === 'childList' && mx.addedNodes) {
        if (mx.addedNodes) {
          let d = mx.addedNodes[0]
          while (d && d !== document && !d.host) {
            d = d.parentNode
          }
          var u = d && (d.URL || d._URL || d.host && d.host.localName) || ''
          u = u.split('/?').shift().split('/').pop()
        }
      }
      console.group('mutations (%d) [%s]', mutations.length, u || '')
    }
    let isAttached = inDocument(root)
    mutations.forEach(function(mx) {
      if (mx.type === 'childList') {
        forEach(mx.addedNodes, function(n) {
          if (!n.localName) {
            return
          }
          addedNode(n, isAttached)
        })
        forEach(mx.removedNodes, function(n) {
          if (!n.localName) {
            return
          }
          detachedNode(n)
        })
      }
    })
    flags.dom && console.groupEnd()
  }
  function takeRecords(node) {
    node = window.wrap(node)
    if (!node) {
      node = window.wrap(document)
    }
    while (node.parentNode) {
      node = node.parentNode
    }
    let observer = node.__observer
    if (observer) {
      handler(node, observer.takeRecords())
      takeMutations()
    }
  }
  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach)
  function observe(inRoot) {
    if (inRoot.__observer) {
      return
    }
    let observer = new MutationObserver(handler.bind(this, inRoot))
    observer.observe(inRoot, {
      childList: true,
      subtree: true
    })
    inRoot.__observer = observer
  }
  function upgradeDocument(doc) {
    doc = window.wrap(doc)
    flags.dom && console.group('upgradeDocument: ', doc.baseURI.split('/').pop())
    let isMainDocument = doc === window.wrap(document)
    addedNode(doc, isMainDocument)
    observe(doc)
    flags.dom && console.groupEnd()
  }
  function upgradeDocumentTree(doc) {
    forDocumentTree(doc, upgradeDocument)
  }
  let originalCreateShadowRoot = Element.prototype.createShadowRoot
  if (originalCreateShadowRoot) {
    Element.prototype.createShadowRoot = function() {
      let root = originalCreateShadowRoot.call(this)
      window.CustomElements.watchShadow(this)
      return root
    }
  }
  scope.watchShadow = watchShadow
  scope.upgradeDocumentTree = upgradeDocumentTree
  scope.upgradeDocument = upgradeDocument
  scope.upgradeSubtree = addedSubtree
  scope.upgradeAll = addedNode
  scope.attached = attached
  scope.takeRecords = takeRecords
})

window.CustomElements.addModule(function(scope) {
  let flags = scope.flags
  function upgrade(node, isAttached) {
    if (node.localName === 'template') {
      if (window.HTMLTemplateElement && HTMLTemplateElement.decorate) {
        HTMLTemplateElement.decorate(node)
      }
    }
    if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
      let is = node.getAttribute('is')
      let definition = scope.getRegisteredDefinition(node.localName) || scope.getRegisteredDefinition(is)
      if (definition) {
        if (is && definition.tag == node.localName || !is && !definition.extends) {
          return upgradeWithDefinition(node, definition, isAttached)
        }
      }
    }
  }
  function upgradeWithDefinition(element, definition, isAttached) {
    flags.upgrade && console.group('upgrade:', element.localName)
    if (definition.is) {
      element.setAttribute('is', definition.is)
    }
    implementPrototype(element, definition)
    element.__upgraded__ = true
    created(element)
    if (isAttached) {
      scope.attached(element)
    }
    scope.upgradeSubtree(element, isAttached)
    flags.upgrade && console.groupEnd()
    return element
  }
  function implementPrototype(element, definition) {
    if (Object.__proto__) {
      element.__proto__ = definition.prototype
    } else {
      customMixin(element, definition.prototype, definition.native)
      element.__proto__ = definition.prototype
    }
  }
  function customMixin(inTarget, inSrc, inNative) {
    let used = {}
    let p = inSrc
    while (p !== inNative && p !== HTMLElement.prototype) {
      let keys = Object.getOwnPropertyNames(p)
      for (var i = 0, k; k = keys[i]; i++) {
        if (!used[k]) {
          Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k))
          used[k] = 1
        }
      }
      p = Object.getPrototypeOf(p)
    }
  }
  function created(element) {
    if (element.createdCallback) {
      element.createdCallback()
    }
  }
  scope.upgrade = upgrade
  scope.upgradeWithDefinition = upgradeWithDefinition
  scope.implementPrototype = implementPrototype
})

window.CustomElements.addModule(function(scope) {
  let isIE = scope.isIE
  let upgradeDocumentTree = scope.upgradeDocumentTree
  let upgradeAll = scope.upgradeAll
  let upgradeWithDefinition = scope.upgradeWithDefinition
  let implementPrototype = scope.implementPrototype
  let useNative = scope.useNative
  function register(name, options) {
    let definition = options || {}
    if (!name) {
      throw new Error('document.registerElement: first argument `name` must not be empty')
    }
    if (name.indexOf('-') < 0) {
      throw new Error("document.registerElement: first argument ('name') must contain a dash ('-'). Argument provided was '" + String(name) + "'.")
    }
    if (isReservedTag(name)) {
      throw new Error("Failed to execute 'registerElement' on 'Document': Registration failed for type '" + String(name) + "'. The type name is invalid.")
    }
    if (getRegisteredDefinition(name)) {
      throw new Error("DuplicateDefinitionError: a type with name '" + String(name) + "' is already registered")
    }
    if (!definition.prototype) {
      definition.prototype = Object.create(HTMLElement.prototype)
    }
    definition.__name = name.toLowerCase()
    if (definition.extends) {
      definition.extends = definition.extends.toLowerCase()
    }
    definition.lifecycle = definition.lifecycle || {}
    definition.ancestry = ancestry(definition.extends)
    resolveTagName(definition)
    resolvePrototypeChain(definition)
    overrideAttributeApi(definition.prototype)
    registerDefinition(definition.__name, definition)
    definition.ctor = generateConstructor(definition)
    definition.ctor.prototype = definition.prototype
    definition.prototype.constructor = definition.ctor
    if (scope.ready) {
      upgradeDocumentTree(document)
    }
    return definition.ctor
  }
  function overrideAttributeApi(prototype) {
    if (prototype.setAttribute._polyfilled) {
      return
    }
    let setAttribute = prototype.setAttribute
    prototype.setAttribute = function(name, value) {
      changeAttribute.call(this, name, value, setAttribute)
    }
    let removeAttribute = prototype.removeAttribute
    prototype.removeAttribute = function(name) {
      changeAttribute.call(this, name, null, removeAttribute)
    }
    prototype.setAttribute._polyfilled = true
  }
  function changeAttribute(name, value, operation) {
    name = name.toLowerCase()
    let oldValue = this.getAttribute(name)
    operation.apply(this, arguments)
    let newValue = this.getAttribute(name)
    if (this.attributeChangedCallback && newValue !== oldValue) {
      this.attributeChangedCallback(name, oldValue, newValue)
    }
  }
  function isReservedTag(name) {
    for (let i = 0; i < reservedTagList.length; i++) {
      if (name === reservedTagList[i]) {
        return true
      }
    }
  }
  var reservedTagList = [ 'annotation-xml', 'color-profile', 'font-face', 'font-face-src', 'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph' ]
  function ancestry(extnds) {
    let extendee = getRegisteredDefinition(extnds)
    if (extendee) {
      return ancestry(extendee.extends).concat([ extendee ])
    }
    return []
  }
  function resolveTagName(definition) {
    let baseTag = definition.extends
    for (var i = 0, a; a = definition.ancestry[i]; i++) {
      baseTag = a.is && a.tag
    }
    definition.tag = baseTag || definition.__name
    if (baseTag) {
      definition.is = definition.__name
    }
  }
  function resolvePrototypeChain(definition) {
    if (!Object.__proto__) {
      let nativePrototype = HTMLElement.prototype
      if (definition.is) {
        let inst = document.createElement(definition.tag)
        nativePrototype = Object.getPrototypeOf(inst)
      }
      let proto = definition.prototype, ancestor
      let foundPrototype = false
      while (proto) {
        if (proto == nativePrototype) {
          foundPrototype = true
        }
        ancestor = Object.getPrototypeOf(proto)
        if (ancestor) {
          proto.__proto__ = ancestor
        }
        proto = ancestor
      }
      if (!foundPrototype) {
        console.warn(definition.tag + ' prototype not found in prototype chain for ' + definition.is)
      }
      definition.native = nativePrototype
    }
  }
  function instantiate(definition) {
    return upgradeWithDefinition(domCreateElement(definition.tag), definition)
  }
  let registry = {}
  function getRegisteredDefinition(name) {
    if (name) {
      return registry[name.toLowerCase()]
    }
  }
  function registerDefinition(name, definition) {
    registry[name] = definition
  }
  function generateConstructor(definition) {
    return function() {
      return instantiate(definition)
    }
  }
  let HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
  function createElementNS(namespace, tag, typeExtension) {
    if (namespace === HTML_NAMESPACE) {
      return createElement(tag, typeExtension)
    } else {
      return domCreateElementNS(namespace, tag)
    }
  }
  function createElement(tag, typeExtension) {
    if (tag) {
      tag = tag.toLowerCase()
    }
    if (typeExtension) {
      typeExtension = typeExtension.toLowerCase()
    }
    let definition = getRegisteredDefinition(typeExtension || tag)
    if (definition) {
      if (tag == definition.tag && typeExtension == definition.is) {
        return new definition.ctor()
      }
      if (!typeExtension && !definition.is) {
        return new definition.ctor()
      }
    }
    let element
    if (typeExtension) {
      element = createElement(tag)
      element.setAttribute('is', typeExtension)
      return element
    }
    element = domCreateElement(tag)
    if (tag.indexOf('-') >= 0) {
      implementPrototype(element, HTMLElement)
    }
    return element
  }
  var domCreateElement = document.createElement.bind(document)
  var domCreateElementNS = document.createElementNS.bind(document)
  let isInstance
  if (!Object.__proto__ && !useNative) {
    isInstance = function(obj, ctor) {
      if (obj instanceof ctor) {
        return true
      }
      let p = obj
      while (p) {
        if (p === ctor.prototype) {
          return true
        }
        p = p.__proto__
      }
      return false
    }
  } else {
    isInstance = function(obj, base) {
      return obj instanceof base
    }
  }
  function wrapDomMethodToForceUpgrade(obj, methodName) {
    let orig = obj[methodName]
    obj[methodName] = function() {
      let n = orig.apply(this, arguments)
      upgradeAll(n)
      return n
    }
  }
  wrapDomMethodToForceUpgrade(Node.prototype, 'cloneNode')
  wrapDomMethodToForceUpgrade(document, 'importNode')
  document.registerElement = register
  document.createElement = createElement
  document.createElementNS = createElementNS
  scope.registry = registry
  scope.instanceof = isInstance
  scope.reservedTagList = reservedTagList
  scope.getRegisteredDefinition = getRegisteredDefinition
  document.register = document.registerElement
});

(function(scope) {
  let useNative = scope.useNative
  let initializeModules = scope.initializeModules
  let isIE = scope.isIE
  if (useNative) {
    let nop = function() {}
    scope.watchShadow = nop
    scope.upgrade = nop
    scope.upgradeAll = nop
    scope.upgradeDocumentTree = nop
    scope.upgradeSubtree = nop
    scope.takeRecords = nop
    scope.instanceof = function(obj, base) {
      return obj instanceof base
    }
  } else {
    initializeModules()
  }
  let upgradeDocumentTree = scope.upgradeDocumentTree
  let upgradeDocument = scope.upgradeDocument
  if (!window.wrap) {
    if (window.ShadowDOMPolyfill) {
      window.wrap = window.ShadowDOMPolyfill.wrapIfNeeded
      window.unwrap = window.ShadowDOMPolyfill.unwrapIfNeeded
    } else {
      window.wrap = window.unwrap = function(node) {
        return node
      }
    }
  }
  if (window.HTMLImports) {
    window.HTMLImports.__importsParsingHook = function(elt) {
      if (elt.import) {
        upgradeDocument(wrap(elt.import))
      }
    }
  }
  function bootstrap() {
    upgradeDocumentTree(window.wrap(document))
    window.CustomElements.ready = true
    let requestAnimationFrame = window.requestAnimationFrame || function(f) {
      setTimeout(f, 16)
    }
    requestAnimationFrame(function() {
      setTimeout(function() {
        window.CustomElements.readyTime = Date.now()
        if (window.HTMLImports) {
          window.CustomElements.elapsed = window.CustomElements.readyTime - window.HTMLImports.readyTime
        }
        document.dispatchEvent(new CustomEvent('WebComponentsReady', {
          bubbles: true
        }))
      })
    })
  }
  if (document.readyState === 'complete' || scope.flags.eager) {
    bootstrap()
  } else if (document.readyState === 'interactive' && !window.attachEvent && (!window.HTMLImports || window.HTMLImports.ready)) {
    bootstrap()
  } else {
    let loadEvent = window.HTMLImports && !window.HTMLImports.ready ? 'HTMLImportsLoaded' : 'DOMContentLoaded'
    window.addEventListener(loadEvent, bootstrap)
  }
})(window.CustomElements);

(function(scope) {
  let style = document.createElement('style')
  style.textContent = '' + 'body {' + 'transition: opacity ease-in 0.2s;' + ' } \n' + 'body[unresolved] {' + 'opacity: 0; display: block; overflow: hidden; position: relative;' + ' } \n'
  let head = document.querySelector('head')
  head.insertBefore(style, head.firstChild)
})(window.WebComponents)
