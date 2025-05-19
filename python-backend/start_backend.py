import os
import sys
import argparse
import subprocess
import signal
import logging
from logging.handlers import RotatingFileHandler
import time
import psutil
import json
from pathlib import Path

# 配置日志记录
log_dir = os.path.join(os.path.expanduser('~'), '.datapresso', 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'backend.log')
log_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
log_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

logger = logging.getLogger('backend_launcher')
logger.setLevel(logging.INFO)
logger.addHandler(log_handler)

# 添加控制台输出
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(console_handler)

def get_python_executable():
    """获取Python可执行文件路径"""
    # 首先尝试使用当前Python解释器
    if hasattr(sys, 'executable') and sys.executable:
        logger.info(f"使用当前Python解释器: {sys.executable}")
        return sys.executable
    
    # 尝试在PATH中查找python/python3
    for cmd in ['python', 'python3']:
        try:
            result = subprocess.run([cmd, '--version'], 
                                   stdout=subprocess.PIPE, 
                                   stderr=subprocess.PIPE,
                                   text=True)
            if result.returncode == 0:
                logger.info(f"在PATH中找到Python: {cmd}")
                return cmd
        except FileNotFoundError:
            continue
    
    # 检查是否有嵌入式Python在特定位置
    possible_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'python', 'python.exe'),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'venv', 'Scripts', 'python.exe'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            logger.info(f"找到嵌入式Python: {path}")
            return path
    
    logger.error("无法找到Python可执行文件")
    raise RuntimeError("无法找到Python可执行文件")

def kill_process_by_port(port):
    """杀死占用指定端口的进程"""
    try:
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                if proc.connections():
                    for conn in proc.connections():
                        if conn.laddr.port == port:
                            logger.info(f"正在终止进程 {proc.pid} ({proc.name()}) - 占用端口 {port}")
                            if sys.platform == 'win32':
                                subprocess.run(['taskkill', '/F', '/PID', str(proc.pid)])
                            else:
                                os.kill(proc.pid, signal.SIGTERM)
                            return True
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                continue
        return False
    except Exception as e:
        logger.error(f"尝试杀死占用端口 {port} 的进程时出错: {e}")
        return False

def check_port_available(port):
    """检查端口是否可用"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = False
    try:
        sock.bind(('127.0.0.1', port))
        result = True
    except:
        result = False
    finally:
        sock.close()
    return result

def start_backend(port=8000, debug=False, reload=False):
    """启动后端服务"""
    logger.info(f"准备启动后端服务在端口 {port}, debug={debug}, reload={reload}")
    
    # 检查端口是否被占用
    if not check_port_available(port):
        logger.warning(f"端口 {port} 已被占用")
        kill_port_result = kill_process_by_port(port)
        logger.info(f"尝试释放端口: {'成功' if kill_port_result else '失败'}")
        
        # 再次检查端口
        if not check_port_available(port):
            logger.error(f"无法释放端口 {port}, 请手动关闭占用该端口的应用")
            return None
    
    # 获取Python可执行文件
    python_exe = get_python_executable()
    
    # 获取主脚本路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    main_script = os.path.join(script_dir, 'main.py')
    
    if not os.path.exists(main_script):
        logger.error(f"找不到主脚本: {main_script}")
        return None
    
    # 构建命令
    cmd = [python_exe, main_script]
    if reload:
        cmd = [python_exe, "-m", "uvicorn", "main:app", "--reload"]
    
    env = os.environ.copy()
    env["PORT"] = str(port)
    if debug:
        env["FASTAPI_ENV"] = "development"
        env["DEBUG"] = "1"
        env["LOG_LEVEL"] = "DEBUG"
    else:
        env["FASTAPI_ENV"] = "production"
        env["DEBUG"] = "0"
        env["LOG_LEVEL"] = "INFO"
    
    # 启动进程
    logger.info(f"启动命令: {' '.join(cmd)}")
    try:
        process = subprocess.Popen(
            cmd,
            cwd=script_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        logger.info(f"后端进程已启动，PID: {process.pid}")
        
        # 将进程PID写入文件
        pid_file = os.path.join(log_dir, 'backend.pid')
        with open(pid_file, 'w') as f:
            f.write(str(process.pid))
        
        return process
    except Exception as e:
        logger.error(f"启动后端进程时出错: {e}")
        return None

def stop_backend():
    """停止后端服务"""
    pid_file = os.path.join(log_dir, 'backend.pid')
    if not os.path.exists(pid_file):
        logger.warning("找不到PID文件，无法确定后端进程")
        return False
    
    try:
        with open(pid_file, 'r') as f:
            pid = int(f.read().strip())
        
        logger.info(f"尝试停止后端进程 (PID: {pid})")
        try:
            if sys.platform == 'win32':
                subprocess.run(['taskkill', '/F', '/PID', str(pid)])
            else:
                os.kill(pid, signal.SIGTERM)
            
            # 等待进程终止
            max_wait = 5  # 最多等待5秒
            for _ in range(max_wait):
                try:
                    p = psutil.Process(pid)
                    time.sleep(1)
                except psutil.NoSuchProcess:
                    break
            
            # 检查进程是否还存在
            try:
                p = psutil.Process(pid)
                logger.warning(f"进程 {pid} 在 {max_wait} 秒后仍然存在，尝试强制终止")
                if sys.platform == 'win32':
                    subprocess.run(['taskkill', '/F', '/T', '/PID', str(pid)])
                else:
                    os.kill(pid, signal.SIGKILL)
            except psutil.NoSuchProcess:
                pass
            
            # 删除PID文件
            os.remove(pid_file)
            logger.info("后端进程已停止")
            return True
        except Exception as e:
            logger.error(f"停止进程时出错: {e}")
            return False
    except Exception as e:
        logger.error(f"读取PID文件时出错: {e}")
        return False

def check_backend_status(port=8000):
    """检查后端服务状态"""
    import http.client
    
    # 检查PID文件
    pid_file = os.path.join(log_dir, 'backend.pid')
    pid_exists = os.path.exists(pid_file)
    
    # 如果PID文件存在，检查进程是否运行
    process_running = False
    if pid_exists:
        try:
            with open(pid_file, 'r') as f:
                pid = int(f.read().strip())
            try:
                p = psutil.Process(pid)
                process_running = p.is_running()
            except psutil.NoSuchProcess:
                process_running = False
        except:
            process_running = False
    
    # 检查是否可以连接到服务
    service_responding = False
    try:
        conn = http.client.HTTPConnection(f"127.0.0.1:{port}", timeout=2)
        conn.request("GET", "/health")
        response = conn.getresponse()
        service_responding = (response.status == 200)
        conn.close()
    except:
        service_responding = False
    
    status = {
        "pid_file_exists": pid_exists,
        "process_running": process_running,
        "service_responding": service_responding,
        "port": port,
        "check_time": time.time()
    }
    
    return status

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='Datapresso 后端服务管理')
    parser.add_argument('action', choices=['start', 'stop', 'restart', 'status'], 
                      help='执行的操作: start, stop, restart, status')
    parser.add_argument('--port', type=int, default=8000, help='后端服务端口 (默认: 8000)')
    parser.add_argument('--debug', action='store_true', help='启用调试模式')
    parser.add_argument('--reload', action='store_true', help='启用自动重载')
    
    args = parser.parse_args()
    
    if args.action == 'start':
        logger.info("启动后端服务...")
        process = start_backend(args.port, args.debug, args.reload)
        if process:
            logger.info("后端服务已启动")
            sys.exit(0)
        else:
            logger.error("启动后端服务失败")
            sys.exit(1)
    
    elif args.action == 'stop':
        logger.info("停止后端服务...")
        result = stop_backend()
        if result:
            logger.info("后端服务已停止")
            sys.exit(0)
        else:
            logger.error("停止后端服务失败")
            sys.exit(1)
    
    elif args.action == 'restart':
        logger.info("重启后端服务...")
        stop_backend()
        time.sleep(1)  # 给进程一点时间完全终止
        process = start_backend(args.port, args.debug, args.reload)
        if process:
            logger.info("后端服务已重启")
            sys.exit(0)
        else:
            logger.error("重启后端服务失败")
            sys.exit(1)
    
    elif args.action == 'status':
        status = check_backend_status(args.port)
        print(json.dumps(status, indent=2))
        if status["service_responding"]:
            sys.exit(0)
        else:
            sys.exit(1)

if __name__ == "__main__":
    main()
