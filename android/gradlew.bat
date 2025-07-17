@rem
@rem ##############################################################################
@rem ##
@rem ##  Gradle wrapper
@rem ##
@rem ##############################################################################

@echo off

setlocal

rem Determine the Java command to use to start the JVM.
if not "%JAVA_HOME%" == "" goto findJavaFromJavaHome

set JAVACMD=java
goto runJava

:findJavaFromJavaHome
set JAVACMD="%JAVA_HOME%\bin\java"
if exist %JAVACMD%.exe goto runJava

:runJava
rem Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS=-Xmx64m -Xms64m

rem Determine the script directory.
set SCRIPT_DIR=%~dp0

rem Execute Gradle.
"%JAVACMD%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %GRADLE_OPTS% -classpath "%SCRIPT_DIR%gradle\wrapper\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
