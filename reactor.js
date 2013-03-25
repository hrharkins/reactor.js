/**
 *  reactor.js - v0.001
 *
 *  Copyright (c) 2013 Rich Harkins.  See LICENSE.
 */

$(function()
{
    function start_reactors()
    {
        var $this = $(this)
        var reactor = $this.attr('data-reactor')
        if (! reactor)
        {
            return
        }
        $this.removeAttr('data-reactor')
        $this.attr('data-reactor-started', reactor)
        start_reactor.apply(this, reactor.split(/\s+/))
    }
    function start_reactor(reactors)
    {
        var $this = $(this)
        for (var index = 0; index < arguments.length; ++index)
        {
            var plugin = arguments[index]
            var match = plugin.match(/^(.*?)=(.*)$/);
            if (match)
            {
                var alias = match[1]
                plugin = match[2]
            }
            else
            {
                var alias = plugin
            }
            var fn = $this[plugin]
            if (fn == null)
            {
                throw "Invalid plugin: " + plugin
            }
            else
            {
                fn.apply($this, $this.data_arguments(alias))
            }
        }
    }
    $.fn.react = function restart_reactor(reactor)
    {
        $.each($(this), function () { start_reactor.call(this, reactor) } )
    }
    $('.data-objects').each(function () { $(this).data_objects() })
    $('[data-reactor]').each(start_reactors)
    function handle_insertion(event)
    {
        //console.log(event)
        if (event)
        {
            $('.data-objects', event.target)
                .each(function () { $(this).data_objects() })
            $('[data-reactor]', event.target).each(start_reactors)
        }
    }
    $(document).on('DOMNodeInserted', handle_insertion)
})

$.fn.data_arguments = 
function data_arguments(scope, defaults, reload)
{
    var args = $(this).data_objects(scope, defaults, reload)
    if (args[''])
    {
        return [args['']]
    }
    else if (args instanceof Array)
    {
        return args
    }
    else
    {
        return [args]
    }
}

$.fn.data_objects =
function data_objects(scope, defaults, reload)
{
    defaults = defaults || {}
    var suffix = scope == null ? '' : '-' + scope
    var constants = $.fn.data_objects.constants
    $(this).each(
    function ()
    {
        var $this = $(this)
        var data = $this.data('data-objects' + suffix)
        if (this.attributes.length && (reload || data == null))
        {
            $this.data('data-objects' + suffix, data = {})
            var updates = {}
            var prefix = 'data-'
            if (scope)
            {
                prefix += scope + ':'
            }
            var prefix_length = prefix.length
            var scope_check = 'data-' + scope
            var array_prefix = scope_check + '#'
            $.each(this.attributes,
            function process(index, attr)
            {
                var name = attr.name
                var colon
                var stack = []
                if (name.substring(0, prefix_length) == prefix)
                {
                    name = name.substr(prefix_length)
                }
                else if (name.substring(0, prefix_length) == array_prefix)
                {
                    name = name.substr(prefix_length)
                }
                else if (name == scope_check)
                {
                    name = name.substr(scope_check.length)
                }
                else
                {
                    return
                }

                // Do these in reverse order
                name = name.replace(/\^(.)/, 
                                    function(m) { return m[1].toUpperCase() })
                while ((colon = name.lastIndexOf(":")) >= 0)
                {
                    var ext = name.substring(colon + 1)
                    var handler = $.fn.data_objects.handlers[ext]
                    if (handler)
                    {
                        stack.push(handler)
                        name = name.substring(0, colon)
                    }
                    else
                    {
                        break
                    }
                }
                var value = attr.value
                if (stack.length)
                {   
                    var context = $this
                    var last = context
                    while (stack.length)
                    {
                        var handler = stack.pop()
                        var result = handler(value, context)
                        context = result[0]
                        value = result[1]
                        if (context != null)
                        {
                            last = context
                        }
                    }
                    if (context == null)
                    {
                        context = last
                    }
                } 
                else 
                {
                    if ( value in constants )
                    {
                        value = constants[value]
                        if (typeof value === 'function')
                        {
                            value = value.call(this)
                        }
                    }
                    context = value
                }

                if (name.substring(0, 1) == '#')
                {
                    if (! (data instanceof Array))
                    {
                        var old = data
                        data = []
                        for (var name in old)
                        {
                            data[name] = old[name]
                        }
                        $this.data('data-objects' + suffix, data)
                    }
                    name = name.substring(1)
                }

                var source = context == null ? value : context
                target = data
                var match
                while (match = name.match(/^([^.#]*)(\.|#)(.*)$/))
                {
                    var address = match[1]
                    var dest = target[address]
                    if (target instanceof Array)
                    {
                        address -= 1
                        if (address < 0)
                        {
                            address = target.length
                        }
                    }
                    name = match[3]
                    switch(match[2])
                    {
                    case ".":
                        if (dest == null)
                        {
                            dest = target[address] = {}
                        }

                    case "#":
                        if (dest == null)
                        {
                            dest = target[address] = []
                        } 
                        else if (! dest instanceof Array)
                        {
                            var newdest = []
                            for (var copy_name in dest)
                            {
                                newdest[copy_name] = dest[copy_name]
                            }
                            dest = target[address] = newdest
                        }
                    }
                    target = dest
                }
                if (target instanceof Array)
                {
                    name -= 1
                    if (name < 0)
                    {
                        name = name.length
                    }
                }
                target[name] = source
            })
        }
        return data
    })
    return $(this).data('data-objects' + suffix)
}
$.fn.data_objects.handlers = {}
$.fn.data_objects.constants = {}

$.fn.data_objects.constant = 
function(key, value)
{
    $.fn.data_objects.constants[key] = value
}
$.fn.data_objects.constant('null', null)
$.fn.data_objects.constant('true', true)
$.fn.data_objects.constant('false', false)
$.fn.data_objects.constant('window', window)
$.fn.data_objects.constant('document', document)
$.fn.data_objects.constant('[]', function () { return [] })

$.fn.data_objects.handler =
function register_data_handler(ext, fn, consumer)
{
    // Produces a consumer function from the handler provided.  Consumer
    // accepts (source, value) and can be:
    //
    // true -- fn is a consumer taking (source, value) and returning
    //          a modified [source, value]
    // false -- fn accepts the current source and ignores value
    // null -- fn accepts value or source if no value is left, consuming
    //          any remaining value
    // string -- value is split on string, fn accepts (before, after).
    //          before defaults to source if no value remains.
    // regex -- value is split on regex, fn accepts (before, after).
    //          before defaults to source if no value remains.
    // function -- consumer is treated as a consumer function
    var processor
    if (consumer == null)
    {
        processor = function(value, source)
        {
            return [fn.call(source, value), '']
        }
    } 
    else if (consumer === true)
    {
        processor = fn
    }
    else if (consumer === false)
    {
        processor = function(value, source)
        {
            return [fn.call(source), value]
        }
    }
    else if (typeof(consumer) === 'string')
    {
        processor = function(value, source)
        {
            var pos = value.indexOf(consumer)
            if (pos < 0)
            {
                return [fn.call(source, value), '']
            }
            else
            {
                return [fn.call(source, value.substr(0, pos)),
                        value.substr(pos + consumer.length)]
            }
        }
    }
    else if (consumer instanceof RegExp)
    {
        processor = function(value, source)
        {
            var m = value.split(consumer, 2)
            if (m.length == 0)
            {
                return [fn.call(source, value), '']
            }
            else if (m.length == 1)
            {
                return [fn.call(source, m[0]), '']
            }
            else 
            {
                var pos = m[0].length
                pos = value.indexOf(m[1], pos)
                return [fn.call(source, m[0]), 
                        value.substr(pos + consumer.length)]
            }
        }
    }
    else if (typeof(consumer) != 'function')
    {
        throw "Invalid consumer type: " + consumer
    }
    $.fn.data_objects.handlers[ext] = processor
    return fn
}

$.fn.data_objects.handler('int', parseInt)
$.fn.data_objects.handler('float', parseFloat)
$.fn.data_objects.handler('str', function(t) { return "" + t})
$.fn.data_objects.handler('$', function(v) { return jQuery(v) }, /::/, true)
$.fn.data_objects.handler('child', function(v) { return $(v, $(this)) }, '::')
$.fn.data_objects.handler('children', function() 
    { return $(this).children() }, false)
$.fn.data_objects.handler('contents', function() 
    { return $(this).contents() }, false)
$.fn.data_objects.handler('parent', 
    function() { return $(this).parent() }, false)
$.fn.data_objects.handler('closest', 
    function(v) { return $(this).closest(v) }, '::')
$.fn.data_objects.handler('prev', 
    function(v) { return $(this).prevAll(v) }, '::')
$.fn.data_objects.handler('next', 
    function(v) { return $(this).nextAll(v) }, '::')
$.fn.data_objects.handler('html', function() { return $(this).html() }, false)
$.fn.data_objects.handler('text', function() { return $(this).text() }, false)
$.fn.data_objects.handler('attr', function(v) { return $(this).attr(v) }, '::')
$.fn.data_objects.handler('data', 
    function(v) { return $(this).attr('data-' + v) }, '::')

function reactor()
{
    var aliases = []
    var bases = []
    var constructor
    var name
    for (var index in arguments)
    {
        var arg = arguments[index]
        switch(typeof arg)
        {
        case 'string':
            if (constructor == null)
            {
                aliases.push(arg)
            }
            else
            {
                bases.push(arg)
            }
            break;
        case 'function':
            constructor = arg
            break;
        default:
            throw "Didn't understand argument: " + arg
        }
    }
    if (! constructor && typeof this === 'function')
    {
        constructor = this
    }
    if (! constructor)
    {
        throw "Constructor is required"
    }
    var name = constructor.toString().match(/function\s+([a-zA-Z0-9_]+)/)[1]
    var src = []
    function make_plugin(name, constructor, methods, proto, base)
    {
        /*
        src.push('function ' + name + '(method)' + '{')
            src.push('console.log(name, methods, method, methods[method])')
            src.push('if ( methods[method] ) {')
                src.push('return methods[method].apply( this, ' +
                            'Array.prototype.slice.call(arguments, 1) )')
            src.push('} else if ( typeof method === "object" || ! method ) {')
                src.push('var args = Array.prototype.slice.call(arguments)')
                src.push('var self = Object.create(proto)')
                src.push('$(this).data( name, self )')
                src.push('args.unshift(self)')
                src.push('return constructor.apply( this, args ) || this')
            src.push('} else if ( base ) {')
                src.push('return base.apply( this, arguments )')
            src.push('} else {')
                src.push('$.error( "Method " + method + " does not exsit on ' +
                            name + '" )')
            src.push('}')
        src.push('}')
        src.push(name)
        return eval(src.join('\n'))
        */

        return function(method)
        {
            if (methods[method])
            {
                return methods[method].apply(
                    this, Array.prototype.slice.call(arguments, 1));
            }
            else if (typeof method === 'object' || ! method)
            {
                var args = Array.prototype.slice.call(arguments)
                var self = Object.create(proto)
                self.this = this
                $(this).data(name, self)
                args.unshift(self)
                return constructor.apply(this, args) || this
            }
            else if (base != null)
            {
                return base.apply(this, arguments)
            }
            else
            {
                $.error('Method ' + method + ' does not exist on ' + name)
            }
        }
    }
    var methods = {}
    var proto = {}
    plugin = make_plugin(name, constructor, methods, proto, bases[0])
    plugin.method =
    function method(fn)
    {
        var method = fn.toString().match(/function\s+([a-zA-Z0-9_]+)/)[1]
        methods[method] = function()
        {
            var args = Array.prototype.slice.call(arguments)
            args.unshift($(this).data(name))
            return fn.apply(this, args)
        }
        proto[method] = function() 
        { 
            var args = Array.prototype.slice.call(arguments)
            args.unshift(method)
            return $(this.this)[name].apply(this.this, args)
        }
        return this
    }

    if (aliases.length)
    {
        for (var index in aliases)
        {
            $.fn[aliases[index]] = plugin
        }
    }
    $.fn[name] = plugin
    return plugin
}
Function.prototype.reactor = 
function() 
{ 
    var args = Array.prototype.slice.call(arguments); 
    args.unshift(this)
    return reactor.apply(this, args)
}

reactor.config =
function Config(element, scope, options, defaults, deep)
{
    if (this instanceof Config)
    {
        if (arguments.length == 1)
        {
            if (arguments[0] instanceof Config)
            {
                this.data = arguments[0].data
            }
            else
            {
                this.data = arguments[0]
            }
        }
        else
        {
            var data = this.data = {}
            if (deep)
            {
                $.extend(true, data, defaults, options, 
                         element.data_objects(scope))
            }
            else
            {
                $.extend(data, defaults, options, 
                         $(element).data_objects(scope))
            }
        }
    }
    else
    {
        var obj = Object.create(reactor.config.prototype)
        reactor.config.apply(obj, arguments)
        return obj
    }
}
reactor.config.prototype.of = function(name) 
{
    return new reactor.config(this.data[name])
}
reactor.config.prototype.each = 
    function(fn) { return $.each(this.data, fn); }
reactor.config.prototype.get = 
    function(name, def) { return this.data[name] || def }
reactor.config.prototype.$ = 
    function(name, def) { return $(this.data[name] || def) }
reactor.config.prototype.int = function(name, def) 
    { return parseInt(this.data[name] || def) }
reactor.config.prototype.float = function(name, def) 
    { return parseFloat(this.data[name] || def) }
reactor.config.prototype.str = function(name, def) 
    { return "" + (this.data[name] || def) }
reactor.config.prototype.bool = function(name, def) 
    { return this.data[name] || def ? true : false }
reactor.config.prototype.args = function(name, def) 
{ 
    var value = this.data[name]
    if (value == null)
    {
        return def || []
    }
    else if (value instanceof Array)
    {
        return value
    }
    else
    {
        return [value]
    }
}
reactor.config.prototype.invoke = function(obj, method, name, def, returns)
{
    name = name == null ? method : name
    var args = this.args(name, def)
    //console.log('invoke', obj, method, name, def, returns, args)
    if (typeof method === 'string')
    {
        var builder = function(obj, method, args, returns)
        {
            return function() 
            {
                //console.log("Triggering", obj, name, args)
                var fn = obj[method]
                if (fn == null)
                {
                    console.warn('Method not defined:', method, 'on', obj)
                }
                else
                {
                    if (returns == null)
                    {
                        return fn.apply(obj, args) 
                    }
                    else
                    {
                        fn.apply(obj, args)
                        return returns
                    }
                }
            }
        }
    }
    else
    {
        var builder = function(obj, method, args, returns)
        {
            //console.log("Triggering", name, args)
            return function() 
            {
                if (returns == null)
                {
                    return method.apply(obj, args)
                }
                else
                {
                    method.apply(obj, args)
                    return returns
                }
            }
        }
    }
    return builder(obj, method, args, returns)
}

reactor(
function upon(self, options)
{
    var $this = $(this)

    var config = 
    new reactor.config($this, 'upon', options, 
    {
        source: $this,
        target: $this
    })

    var $global_source = config.$('source')
    var $global_target = config.$('target')

    config.each(
    function each_config(eventtype, actions)
    {
        switch(eventtype)
        {
        case "source": break
        case "target": break
        default:
            var subcfg = config.of(eventtype)
            setup_actions(eventtype, subcfg, actions, 
                          $global_source, $global_target, false)
        }
    })

    function setup_actions(eventtype, subcfg, actions, 
                           $source, $target, returns)
    {
        var $source = subcfg.$('source', $source)
        var $target = subcfg.$('target', $target)
        var returns = subcfg.bool('return', returns)
        if (actions instanceof Array)
        {
            $.each(actions,
            function(index, action)
            {
                setup_actions(eventtype, subcfg.of(index), action, 
                              $source, $target, returns)
            })
        }
        else
        {
            $.each(actions,
            function(action)
            {
                switch(action)
                {
                case "source": break
                case "target": break
                case "return": break
                default:
                    $source.on(eventtype, 
                        subcfg.invoke($target, action, action, null, returns))
                }
            })
        }
    }
});

reactor(
function whence(self, options)
{
    var $this = $(this)

    var config =
    new reactor.config($this, 'whence', options,
    {
        time: 0,
        target: $this
    })
   
    var time = config.float('time')
    var $target = config.$('target')

    function setupDelay($target, time, config)
    {
        setTimeout(
        function()
        {
            function each_config(method, args)
            {
                switch(method)
                {
                case "time": break
                case "target": break
                default:
                    var fn = $this[method]
                    if (fn)
                    {
                        fn.apply($target, args)
                    }
                    else
                    {
                        $.error('Invalid method ' + method + args)
                    }
                }
            }
            config.each(each_config)
        }, time * 1000)
    }
    setupDelay($target, time, config)
})

