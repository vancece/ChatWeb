import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {CookieService} from 'ngx-cookie-service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  // 记录当前主机地址,端口号
  public host = 'http://193.112.248.246';
  public port = '8080';

  // 储存返回来的id
  public returnId = '';

  // 储存返回来的密码
  public returnPassword = '';

  // 用户名正则表达式
  public nameCheckString: any = /[a-zA-Z_][a-zA-Z0-9_]*/;

  // 邮箱正则表达式
  public emailCheckString: any = /[0-9a-zA-Z_.-]+[@][0-9a-zA-Z_.-]+([.][a-zA-Z]+){1,2}/;

  // 手机正则表达式
  public telCheckString: any = /^1(?:3\d|4[4-9]|5[0-35-9]|6[67]|7[013-8]|8\d|9\d)\d{8}$/;

  // 记录cookie是否能用
  public cookieEnable: boolean;

  // 记录是否自动登录
  public autoLogin = false;

  // 储存输入数据的对象
  public inputData: any = {
    name: '',
    password: '',
    tel: '',
    email: '',
    checkCode: ''
  };

  // 对验证码的操作
  nums: string[] = [];

  // image的document对象
  public image: any;

  // 画布
  public canvas: any;

  // 对验证码的操作结束
  public inputStatus: any = {
    name: '*用户名为空！',
    password: '*密码为空!',
    tel: '*手机号为空！',
    email: '*邮箱为空!',
    checkCode: '*验证码为空!'
  };

  // 记录输入是否正确的对象
  public boolInputStatus: any = {
    name: false,
    password: false,
    tel: false,
    email: false,
    checkCode: false
  };

  // 类的构造函数
  constructor(public http: HttpClient, public router: Router, public cookies: CookieService) {
  }

  // 原始函数，初始化
  ngOnInit() {
    this.createRandom();
    this.checkEnableCookie();
  }

  // 用户点下了注册的按钮之后，进行检查，如果没有问题的话，就发送数据进行注册
  doCheckAndSend() {
    if (this.boolInputStatus.name && this.boolInputStatus.password && this.boolInputStatus.email && this.boolInputStatus.checkCode) {
      // 输入的内容全部正确的时候
      // 开始进行传输
      // 1.创建出头部
      // const headerOption = {header: new HttpHeaders({'Content-Type': 'application/json'})};
      // 2.创建出目标路径
      const address = this.host + ':' + this.port + '/register';
      // 3.post
      // tslint:disable-next-line:max-line-length
      const jsonData = `{"name":"` + this.inputData.name + `","password":"` + this.inputData.password + `","email":"` + this.inputData.email + `","tel":"` + this.inputData.tel + `"}`;
      const postResult = this.http.post(address, jsonData);
      // 4.回调函数
      postResult.subscribe((response: any) => {
        console.log(response);
        document.getElementById('input-button').setAttribute('disabled', 'disabled');

        // 记录传送回来的id,密码
        this.returnId = response.id;
        this.returnPassword = response.password;

        // 宣布注册成功
        alert('注册成功！');
        // 设置status的值
        //  A.0代表用户已经设置cookie,可以从cookie获取数据,这是一种安全的方法
        //  B.1代表用户没有设置cookie,但为了安全起见,避免用户可以通过链接进行登录,记录一个临时cookie
        //  C.2代表用户禁止了cookie,需要从连接中获取登录内容,是一种非常不安全的方法
        let status: number;
        if (!this.cookieEnable) {
          status = 2;
        } else if (this.autoLogin) {
          status = 0;
        } else {
          status = 1;
        }
        this.jumpToChat(status);

      });

    } else {
      alert('请检查你的输入！');
    }
  }

  // 如果登录成功，实现路由跳转到聊天界面
  // 如果登录成功，实现路由跳转到聊天界面
  jumpToChat(loginStatus: number) {
    // A.0代表用户开启了cookie,可以从cookie获取数据,这是一种安全的方法
    // B.1代表用户没有设置cookie,但为了安全起见,避免用户可以通过链接进行登录,记录一个临时cookie
    // C.2代表用户禁止了cookie,需要从连接中获取登录内容,是一种非常不安全的方法
    // 官方模板
    // this.router.navigate(['/weChat'], {queryParams: {s: status}});
    if (loginStatus === 0) {
      this.setLoginCookie();
      this.router.navigate(['/weChat'], {queryParams: {s: loginStatus}});
    } else if (loginStatus === 1) {
      // 设置临时cookie,不指定时间,会在用户退出浏览器时自动清除
      //  设置的内容:
      //   name: '',
      //   password: '',
      //   tel: '',
      //   email: '',
      //   checkCode: ''
      this.cookies.set('tuid', this.returnId);
      this.cookies.set('tname', this.inputData.name);
      this.cookies.set('tps', this.returnPassword);
      this.router.navigate(['/weChat'], {queryParams: {s: loginStatus}});
    } else if (loginStatus === 2) {
      // 最不安全的方法
      alert('警告,由于你的浏览器禁用了cookie,即将使用不安全的登录方式,请勿将你的聊天链接发送给其他人');
      this.router.navigate(['/weChat'], {
          queryParams: {
            s: loginStatus, uid: this.returnId, na: this.inputData.name, ps: this.returnPassword
          }
        }
      );
    }
  }

  // 检查用户名的输入
  checkUser() {
    if (!this.inputData.name) {
      this.inputStatus.name = '*用户名为空！';
      this.boolInputStatus.name = false;
    } else {
      if (this.nameCheckString.test(this.inputData.name)) {
        this.inputStatus.name = '正确！';
        this.boolInputStatus.name = true;
      } else {
        this.inputStatus.name = '*格式错误！';
        this.boolInputStatus.name = false;
      }
    }
  }

  // 检查密码的输入
  checkPassword() {
    if (!this.inputData.password) {
      this.inputStatus.password = '*密码为空！';
      this.boolInputStatus.password = false;
    } else {
      this.inputStatus.password = '正确！';
      this.boolInputStatus.password = true;
    }
  }

  // 检查手机号的输入
  checkTel() {
    if (!this.inputData.tel) {
      this.inputStatus.tel = '*手机号为空！';
      this.boolInputStatus.tel = false;
    } else if (!this.telCheckString.test(this.inputData.tel)) {
      this.inputStatus.tel = '手机格式错误！';
      this.boolInputStatus.tel = false;
    } else {
      this.inputStatus.tel = '正确！';
      this.boolInputStatus.tel = true;
    }
  }

  // 检查邮箱的输入
  checkEmail() {
    if (!this.inputData.email) {
      this.inputStatus.email = '*邮箱为空！';
      this.boolInputStatus.email = false;
    } else if (!this.emailCheckString.test(this.inputData.email)) {
      this.inputStatus.email = '邮箱格式错误！';
      this.boolInputStatus.email = false;
    } else {
      this.inputStatus.email = '正确！';
      this.boolInputStatus.email = true;
    }
  }

  // 检查验证码
  checkCode() {
    if (!this.inputData.checkCode) {
      this.inputStatus.checkCode = '*验证码为空！';
      this.boolInputStatus.checkCode = false;
    } else {
      let checked = true;
      for (let i = 0; i < 4; ++i) {
        if (this.inputData.checkCode[i] !== this.nums[i]) {
          checked = false;
        }
      }

      if (checked) {
        this.inputStatus.checkCode = '正确！';
        this.boolInputStatus.checkCode = true;
      } else {
        this.inputStatus.checkCode = '验证码错误！';
        this.boolInputStatus.checkCode = false;
      }
    }
  }

  // 生成随机验证码的值
  createRandom() {

    this.nums = [];
    for (let i = 0; i < 4; ++i) {
      const range = 9;
      const rand = Math.random();
      this.nums.push(String(Math.round(rand * range)));
    }
    // 绘制验证码
    this.drawCode('');
  }

  // 绘制验证码主函数
  drawCode(str) {
    this.canvas = document.getElementById('verifyCanvas'); // 获取HTML端画布
    const context: CanvasRenderingContext2D = this.canvas.getContext('2d'); // 获取画布2D上下文

    // 清除画布以免产生很多线条
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    context.fillStyle = 'white'; // 画布填充色
    context.fillRect(0, 0, this.canvas.width, this.canvas.height); // 清空画布
    context.fillStyle = 'cornflowerblue'; // 设置字体颜色
    context.font = '25px Arial'; // 设置字体

    const rand = [];
    const x = [];
    const y = [];

    // tslint:disable-next-line:no-shadowed-variable
    for (let i = 0; i < 4; i++) {
      rand.push(rand[i]);
      rand[i] = this.nums[i];
      x[i] = i * 20 + 10;
      y[i] = Math.random() * 20 + 20;
      context.fillText(rand[i], x[i], y[i]);
    }
    str = rand.join('').toUpperCase();

    // 画3条随机线
    // tslint:disable-next-line:no-shadowed-variable
    for (let i = 0; i < 3; i++) {
      this.drawline(this.canvas, context);
    }

    // 画30个随机点
    for (let i = 0; i < 30; i++) {
      this.drawDot(this.canvas, context);
    }
    this.convertCanvasToImage(this.canvas);

    return str;
  }

  // 生成随机线辅助函数
  drawline(canvas, context) {
    context.moveTo(Math.floor(Math.random() * canvas.width), Math.floor(Math.random() * canvas.height)); // 随机线的起点x坐标是画布x坐标0位置，y坐标是画布高度的随机数
    context.lineTo(Math.floor(Math.random() * canvas.width), Math.floor(Math.random() * canvas.height)); // 随机线的终点x坐标是画布宽度，y坐标是画布高度的随机数
    context.lineWidth = 0.5; // 随机线宽
    context.strokeStyle = 'rgba(50,50,50,0.3)'; // 随机线描边属性
    context.stroke(); // 描边，即起点描到终点
  }

  // 生成随机点辅助函数(所谓画点其实就是画1px像素的线，方法不再赘述)
  drawDot(canvas, context) {
    const px = Math.floor(Math.random() * canvas.width);
    const py = Math.floor(Math.random() * canvas.height);
    context.moveTo(px, py);
    context.lineTo(px + 1, py + 1);
    context.lineWidth = 0.2;
    context.stroke();
  }

  // 绘制图片辅助函数
  convertCanvasToImage(canvas) {
    document.getElementById('verifyCanvas').style.display = 'none';
    this.image = document.getElementById('code_img');
    this.image.src = canvas.toDataURL('image/png');
    return this.image;
  }

  // cookie的检测程序
  checkEnableCookie() {
    this.cookieEnable = navigator.cookieEnabled === true;
  }

  // 设置登录cookie
  setLoginCookie() {
    if (this.cookieEnable) {
      // 设置过期时间7天
      // cookie内容
      //  uid:记录用户的id
      //  name:记录用户的名字
      //  ps:记录用户的密码
      const time: number = 1000 * 60 * 60 * 24 * 7;
      this.cookies.set('uid', this.returnId, new Date(new Date().getTime() + time));
      this.cookies.set('name', this.inputData.name, new Date(new Date().getTime() + time));
      this.cookies.set('ps', this.returnPassword, new Date(new Date().getTime() + time));
    }
  }

  // 自动登录按钮处理程序
  // 原理,因为不知道触发函数,所以每次点击checkbox都改变boolean的值
  processAutoLogin() {
    this.autoLogin = !this.autoLogin;
  }
}
