import { Component, OnInit } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {CookieService} from 'ngx-cookie-service';
import {Router} from '@angular/router';


@Component({
  selector: 'app-user-mgr',
  templateUrl: './user-mgr.component.html',
  styleUrls: ['./user-mgr.component.css']
})
export class UserMgrComponent implements OnInit {
// 记录当前主机地址,端口号
  public host = 'http://193.112.248.246';
  public port = '8080';

  // 储存输入数据的对象
  public inputData: any = {
    name: '',
    password: '',
    checkCode: ''
  };

  // 记录登录返回的信息
  public loginMessage: any = {
    uid: '',
    status: '',
    password: '',
  };

  // 对验证码的操作
  nums: string[] = [];

  // 记录cookie是否能用
  public cookieEnable: boolean;

  // 记录是否自动登录
  public autoLogin = true;

  // image的document对象
  public image: any;

  // 画布
  public canvas: any;

  // 对验证码的操作结束
  public inputStatus: any = {
    name: '*用户名为空！',
    password: '*密码为空!',
    checkCode: '*验证码为空!'
  };

  // 记录输入是否正确的对象
  public boolInputStatus: any = {
    name: false,
    password: false,
    checkCode: false
  };

  // 类的构造函数
  constructor(public http: HttpClient, public cookies: CookieService, public router: Router) {
  }

  // 原始函数，初始化
  ngOnInit() {
    // 创建图片验证码
    this.createRandom();
    // 查看cookie是否禁用
    this.checkEnableCookie();
  }

  // 如果登录成功，实现路由跳转到聊天界面
  jumpToChat() {
      this.router.navigate(['/admin']).then(() => {});
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
      const time: number = 1000 * 60 * 60 * 24;
      this.cookies.set('uid', this.loginMessage.uid, new Date(new Date().getTime() + time));
      this.cookies.set('name', this.inputData.name, new Date(new Date().getTime() + time));
      this.cookies.set('ps', this.loginMessage.password, new Date(new Date().getTime() + time));
    }
  }

  // 用户点下了登录的按钮之后，进行检查，如果没有问题的话，就发送数据进行登录
  doCheckAndSend() {
    if (this.boolInputStatus.name && this.boolInputStatus.password && this.boolInputStatus.checkCode) {
      // 输入的内容全部正确的时候
      // 开始进行传输
      // 1.创建出头部
      // const headerOption = {header: new HttpHeaders({'Content-Type': 'application/json'})};
      // 2.创建出目标路径
      // --------------登录的后端地址-------------------
      const address = this.host + ':' + this.port + '/adminLogin';
      // 3.post
      // tslint:disable-next-line:max-line-length
      const jsonData = `{"name":"` + this.inputData.name + `","password":"` + this.inputData.password + `"}`;
      const postResult = this.http.post(address, jsonData);
      // 4.回调函数
      postResult.subscribe((response: any) => {
        // 进行记录
        this.loginMessage.uid = response.uid;
        this.loginMessage.status = response.status;
        this.loginMessage.password = response.pas;
        // A.0 :登录成功
        // B.1 :密码错误
        // C.2 :没有该用户
        // tslint:disable-next-line:triple-equals
        if (this.loginMessage.status == '0') {
          // 进行cookie的设置,如果设置了自动登录的话
          if (this.cookieEnable) {
            this.setLoginCookie();
          } else {
            alert('为了安全,需要开启cookie');
            return;
          }

          document.getElementById('input-button').setAttribute('disabled', 'disabled');
          // 进行跳转
          this.jumpToChat();

          // tslint:disable-next-line:triple-equals
        } else {
          alert('请检查输入');
        }

      });
    } else {
      alert('请检查你的输入！');
    }
  }

  // 检查用户名的输入
  checkUser() {
    if (!this.inputData.name) {
      this.inputStatus.name = '*用户名为空！';
      this.boolInputStatus.name = false;
    } else {
      this.inputStatus.name = '正确！';
      this.boolInputStatus.name = true;
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
}
