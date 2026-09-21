#include <cstddef>
#include <cstring>
#include <string>

#include "Luau/Compiler.h"
#include "lua.h"
#include "lualib.h"

// Output buffer for the current executeScript() call. A single-threaded worker
// means there is never more than one of these in flight. cwrap() copies the
// returned C string synchronously, so reusing this buffer across calls is safe.
static std::string gOutput;

// Mirrors Luau's built-in print(): converts each argument to a string using
// __tostring semantics (luaL_tolstring), joins with tabs, ends with a newline.
static int capturePrint(lua_State* L)
{
    int n = lua_gettop(L);
    for (int i = 1; i <= n; i++)
    {
        size_t len = 0;
        const char* s = luaL_tolstring(L, i, &len);
        if (i > 1)
            gOutput += '\t';
        gOutput.append(s, len);
        lua_pop(L, 1); // pop converted result
    }
    gOutput += '\n';
    return 0;
}

static int reportCompileError(lua_State* L)
{
    const char* msg = lua_tostring(L, -1);
    gOutput = "ERROR:";
    if (msg)
        gOutput += msg;
    else
        gOutput += "unknown compile error";
    return 0;
}

extern "C" const char* executeScript(const char* source)
{
    gOutput.clear();

    try
    {
        lua_State* L = luaL_newstate();
        if (!L)
            return "ERROR:failed to allocate Luau state";

        luaL_openlibs(L);

        // Redirect print() so output is captured instead of written to stdout.
        lua_pushcfunction(L, capturePrint, "print");
        lua_setglobal(L, "print");

        size_t sourceLen = source ? strlen(source) : 0;
        std::string bytecode = Luau::compile(source ? std::string(source, sourceLen) : "");
        lua_pushvalue(L, LUA_GLOBALSINDEX); // environment table shared with the state
        if (luau_load(L, "@lesson", bytecode.data(), bytecode.size(), lua_gettop(L)) != 0)
        {
            reportCompileError(L);
            lua_close(L);
            return gOutput.c_str();
        }

        if (lua_pcall(L, 0, 0, 0) != 0)
        {
            const char* msg = lua_tostring(L, -1);
            gOutput = "ERROR:";
            if (msg)
                gOutput += msg;
            else
                gOutput += "runtime error";
            lua_close(L);
            return gOutput.c_str();
        }

        lua_close(L);
        return gOutput.c_str();
    }
    catch (const std::exception& e)
    {
        gOutput = "ERROR:";
        gOutput += e.what();
        return gOutput.c_str();
    }
    catch (...)
    {
        return "ERROR:unknown failure";
    }
}