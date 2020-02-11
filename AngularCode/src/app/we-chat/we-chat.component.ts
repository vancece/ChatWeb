import {Component, AfterViewChecked, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CookieService} from 'ngx-cookie-service';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';

@Component({
  selector: 'app-we-chat',
  templateUrl: './we-chat.component.html',
  styleUrls: ['./we-chat.component.css']
})
export class WeChatComponent implements OnInit, AfterViewChecked, OnDestroy {

  // 记录当前主机地址,端口号
  public host = 'http://193.112.248.246 ';
  public port = '8080';
  public travelTime = 2000;

  // 记录用户是否登录
  public isOnline = false;

  // 记录定时器
  public messageInterval;
  public chatInterval;

  // 记录登录状态的数据
  // A.-1代表错误,接收不到status数据
  // B.0代表用户已经设置cookie,可以从cookie获取数据,这是一种安全的方法
  // C.1代表用户没有设置cookie,但为了安全起见,避免用户可以通过链接进行登录,记录一个临时cookie
  // D.2代表用户禁止了cookie,需要从连接中获取登录内容,是一种非常不安全的方法
  public loginStatus;

  // 这个对象用来保存登录数据
  private loginData: any = {
    uid: -1,
    name: '',
    password: ''
  };

  // 数据绑定聊天信息文件的名字
  private imgName = '未选择图片';

  // 存储用户的状态
  //  1.代表在线
  //  0.代表离线,用于隐身
  private userStatus = '1';

  // 数据绑定聊天信息的头名字
  private headerName = '请在左侧选择联系人';

  // 记录当前聊天者的名字
  private senderName = '';

  // 数据绑定聊天信息中最后登录时间
  private lastLoginTime = '';

  // 这个对象用来双向数据绑定输入框的聊天内容
  private message = '';

  // 这个数组用来保存联系人数据,其中包含的是对象,由于不知道怎么初始化,后期使用push方式对数组进行初始化,记得进行赋空值,不然在typescript转为javascript的时候会把它转成对象
  public linkmanData: any[] = [];

  // 这个数组用来保存聊天内容,跟上面一样,其中包含的是对象,传输数据的时候使用push方式进行初始化数组
  public messageData: any[] = [];

  // 自带的构造函数
  constructor(public route: ActivatedRoute, public router: Router, public cookieService: CookieService, public http: HttpClient) {
  }

  // 记录当前聊天窗口显示的用户的id,默认是1
  private chatId = 0;

  // 自带的初始化函数
  ngOnInit() {
    // 进行登录状态的初始化
    this.initStatus();
    // 进行loginData对象的初始化
    this.initLoginData();
    // 再次进行密码的判断,以免承受攻击
    this.checkLogin();

    // 进行联系人的获取
    this.initLinkman();
    // 初始化聊天界面窗口
    // this.initChatBox();

    // 消息轮回
    this.messageInterval = setInterval(() => {
      console.log('heard hit');
      this.getNewMessageInChatBox();
    }, this.travelTime);

    // 检测联系人更新
    this.chatInterval = setInterval(() => {
      console.log('chat heard hit');
      this.initLinkman();
    }, this.travelTime * 5);

    // 网页关闭的监听函数
    window.onbeforeunload = () => {
      window.clearInterval(this.messageInterval);
      window.clearInterval(this.chatInterval);

      // 更改用户状态为离线
      this.turnToOffline();
    };
  }

  // 自带生命周期钩子函数,视图检查时调用
  ngAfterViewChecked(): void {
  }

  // 组件销毁的时候
  ngOnDestroy(): void {
    window.clearInterval(this.messageInterval);
    window.clearInterval(this.chatInterval);

    // 更改用户状态为离线
    this.turnToOffline();
  }

  // 初始化status的值
  initStatus() {
    // this.loginStatus = this.route.queryParams._value.
    this.route.queryParams.subscribe((data) => {
      this.loginStatus = data.s;
      if (this.loginStatus === undefined) {
        console.log('未授权登录');
        this.closeChat();
      }
    });
  }

  // 处理时间的函数
  processTIme(time: string) {
    time = time.substr(0, 19);
    const temp = time.substr(11, 9);
    time = time.substr(0, 10) + ' ' + temp;

    return time;
  }

  // 聊天窗口滚到最底部函数
  scrollToBottom() {
    setTimeout(() => {
      let msgBox: HTMLElement;
      msgBox = document.getElementById('messageBox');
      msgBox.scrollTop = msgBox.scrollHeight;
    }, 200);
  }

  // 初始化用户登录数据
  initLoginData() {
    //  status:
    //    A.0代表用户已经设置cookie,可以从cookie获取数据,这是一种安全的方法
    //    B.1代表用户没有设置cookie,但为了安全起见,避免用户可以通过链接进行登录,记录一个临时cookie
    //    C.2代表用户禁止了cookie,需要从连接中获取登录内容,是一种非常不安全的方法
    // 如果用户已经设置了cookie, 从cookie中获取数据初始化对象
    // tslint:disable-next-line:triple-equals
    if (this.loginStatus == 0) {
      // cookie内容
      //  uid:记录用户的id
      //  name:记录用户的名字
      //  ps:记录用户的密码
      this.loginData.uid = this.cookieService.get('uid');
      this.loginData.name = this.cookieService.get('name');
      this.loginData.password = this.cookieService.get('ps');

      // tslint:disable-next-line:triple-equals
    } else if (this.loginStatus == 1) {
      // 如果用户选择不设置cookie,那么就从临时数据里面获取值
      // 临时cookie 的内容
      //    status:记录转台
      //    tuid:记录用户的uid
      //    tname:记录用户的名字
      //    tps:记录用户的密码
      this.loginData.uid = this.cookieService.get('tuid');
      this.loginData.name = this.cookieService.get('tname');
      this.loginData.password = this.cookieService.get('tps');

      // tslint:disable-next-line:triple-equals
    } else if (this.loginStatus == 2) {
      // 如果用户禁用了cookie 的时候
      // get链接的内容
      //  s:记录登录状态
      //  uid:记录用户的id
      //  na:记录用户的名字
      //  ps:记录用户的密码
      this.route.queryParams.subscribe((data) => {
        this.loginData.uid = data.uid;
        this.loginData.name = data.name;
        this.loginData.password = data.ps;
      });
    }
  }

  // 再次进行密码的判断,以免承受攻击
  checkLogin() {
    // 1.生成地址
    const address = this.host + ':' + this.port + '/weChatLoginCheck';
    // 2.生成jsonData 数据
    //  json
    //    name
    //    password
    //    id
    // tslint:disable-next-line:max-line-length
    const jsonData = `{"name":"` + this.loginData.name + `","password":"` + this.loginData.password + `","id":` + this.loginData.uid + `}`;

    // 3.进行post数据
    const postResult = this.http.post(address, jsonData);

    // 4.进行消息的处理
    postResult.subscribe((response: any) => {
      if (response.status === 'ok') {
        this.turnToInline();
        return;
      } else {
        this.closeChat();
      }
    });
  }

  // 进行联系人的获取
  initLinkman() {
    const address = this.host + ':' + this.port + '/getLinkman';
    // 要返回的数据
    const jsonData = `{"name":"` + this.loginData.name + `","password":"` + this.loginData.password + `","id":` + this.loginData.uid + `}`;
    const result = this.http.post(address, jsonData);

    let length: number;
    let id: any[];
    let name: any[];
    let status: any[];
    let unread: any[];
    result.subscribe((response: any) => {
      // 清空联系人
      this.linkmanData = [];

      // 来了来了 ,进行数组赋值
      length = response.length;
      id = response.id;
      name = response.name;
      status = response.status;
      unread = response.unread;

      // 开始push,初始化linkmanData数组
      for (let i = 0; i < length; i++) {
        const tempObj: any = {
          id: id[i],
          name: name[i],
          status: status[i],
          unread: unread[i]
        };
        this.linkmanData.push(tempObj);
      }
    });
  }

  // 去除回车
  removeEnter(target: string) {
    target = target.replace(/\n/g, '');
    target = target.replace(/\r/g, '');
    return target;
  }

  // 字符转义
  html2Escape(sHtml: string) {
    return sHtml.replace(/[<>&"/n]/g, (c) => {
      return {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;'
      }[c];
    });
  }

  // 返回当前的时间
  getTimeNow() {
    const time = new Date();
    const month = time.getMonth() + 1;
    return time.getFullYear() + '-' + month + '-' + time.getDate() + ' ' + time.getHours() +
      ':' + time.getMinutes() + ':' + time.getSeconds();
  }

  // 发送信息的函数
  sendMessage() {
    // 判断消息是否为空,如果不为空,发送消息,如果为空,判断图片是否为空,如果不为空,发送图片
    if (this.chatId === 0) {
      return;
    }
    if (this.message === '') {
      this.sendPhoto();
      this.inputFileChange();
      return;
    } else {
      // 1.生成地址
      const address = this.host + ':' + this.port + '/sendMessage';

      // 2.转为json数据
      //  接收方结构
      //    ID       	int    	`json:"id"`
      //    Name     	string 	`json:"name"`
      //    Password 	string 	`json:"password"`
      //    Receiver	int		`json:"receiver"`
      //    Message 	string	`json:"message"`
      //    手动构建json,虽然有点笨,但确实可行!
      const jsonData = `{` +
        `"name":"` + this.loginData.name +
        `","password":"` + this.loginData.password +
        `","id":` + this.loginData.uid +
        `,"receiver":` + this.chatId +
        `,"message":"` + this.removeEnter(this.html2Escape(this.message)) +
        `"}`;

      // 3.post数据并订阅,并更新聊天界面的数据
      this.http.post(address, jsonData).subscribe((response: any) => {
        this.messageData.push({
          sender: this.loginData.uid,
          receiver: this.chatId,
          time: this.getTimeNow(),
          type: 0,
          msg: this.removeEnter(this.html2Escape(this.message))
        });
        this.scrollToBottom();
        this.message = '';
      });
    }
  }

  // 点击联系人改变聊天界面
  changeChatBox(targetId: number, name: string, status: string) {
    // -3判断和当前的显示聊天页面的用户id是否相同,如果相同,不进行任何操作
    if (this.chatId === targetId) {
      return;
    }

    // -2修改当前聊天者的名字
    this.senderName = name;

    // -1修改目标头部
    this.headerName = name;

    // 0.设置chatId
    this.chatId = targetId;

    // 1.设置地址
    const address = this.host + ':' + this.port + '/getMessage';

    // 2.设置传送的数据
    //  ID       	int    	`json:"id"`
    //  Name     	string 	`json:"name"`
    //  Password 	string 	`json:"password"`
    //  Target	 	int   	`json:"target"`
    const jsonData = `{` +
      `"name":"` + this.loginData.name +
      `","password":"` + this.loginData.password +
      `","id":` + this.loginData.uid +
      `,"target":` + this.chatId +
      `}`;

    // 3.开始进行传送数据,进行回调
    //  Length	int	`json:"length"`
    //  Sender		[MAXMESSAGENUM]string	  `json:"sender"`
    //  Receiver 	[MAXMESSAGENUM]string	  `json:"receiver"`
    //  Time    	[MAXMESSAGENUM]string 	`json:"time"`
    //  Type    	[MAXMESSAGENUM]string 	`json:"type"`
    //  Msg     	[MAXMESSAGENUM]string 	`json:"msg"`
    this.http.post(address, jsonData).subscribe((response: any) => {
      // 1.清空消息盒子
      this.messageData = [];
      // 2.获取数据长度
      const messageLength = response.length;

      // 3.获取目标联系人最后登录时间
      this.lastLoginTime = this.processTIme(response.ltime);

      // 4.对消息盒子进行赋值
      for (let i = messageLength - 1; i >= 0; i--) {
        this.messageData.push({
          sender: response.sender[i],
          receiver: response.receiver[i],
          time: this.processTIme(response.time[i]),
          type: response.type[i],
          msg: response.msg[i]
        });
      }
      if (messageLength !== 0) {
        this.scrollToBottom();
      }
    });

    // 5.改变未读消息的状态
    this.changeUnreadStatus(targetId);

    // 6.改变信息栏目的在线状态
    this.isOnline = status !== '0';
  }

  // 改变消息未读状态
  changeUnreadStatus(sender: number) {
    // 1.创建地址
    const address = this.host + ':' + this.port + '/changeReadStatus';

    // 2.打包数据
    //  发送内容
    //  ID       int    `json:"id"`
    //  Name     string `json:"name"`
    //  Password string `json:"password"`
    //  Sender int      `json:"sender"`
    const jsonData = `{"name":"` +
      this.loginData.name +
      `","password":"` +
      this.loginData.password +
      `","id":` +
      this.loginData.uid +
      `,"sender":` +
      sender +
      `}`;

    // 3.发送数据并订阅返回消息
    this.http.post(address, jsonData).subscribe((response: any) => {
      console.log(response.status);
    });
  }

  // 查看是否有新的消息
  getNewMessageInChatBox() {
    // 1.创建地址
    const address = this.host + ':' + this.port + '/getNewMessage';

    // 2.创建打包json数据
    const jsonData = `{"name":"` +
      this.loginData.name +
      `","password":"` +
      this.loginData.password +
      `","id":` +
      this.loginData.uid +
      `,"target":` +
      this.chatId +
      `}`;
    // 3.进行消息的上传,并且订阅返回消息
    this.http.post(address, jsonData).subscribe((response: any) => {
      //  Length   int                   	 `json:"length"`
      //  Sender   [MAXMSGINONETIME]string `json:"sender"`
      //  Receiver [MAXMSGINONETIME]string `json:"receiver"`
      //  Time     [MAXMSGINONETIME]string `json:"time"`
      //  Type     [MAXMSGINONETIME]string `json:"type"`
      //  Msg      [MAXMSGINONETIME]string `json:"msg"`
      for (let i = response.length - 1; i >= 0; i--) {
        this.messageData.push({
          sender: response.sender[i],
          receiver: response.receiver[i],
          time: this.processTIme(response.time[i]),
          type: response.type[i],
          msg: response.msg[i]
        });
      }
      if (response.length !== 0) {
        this.scrollToBottom();
      }
    });
  }

  // 更改用户状态为离线
  turnToOffline() {
    // 1.创建地址并打包数据
    const address = this.host + ':' + this.port + '/turnToOffline';
    const jsonData = `{"name":"` + this.loginData.name + `","password":"` +
      this.loginData.password + `","id":` + this.loginData.uid + `}`;

    // 2.发送数据并设置回调函数
    this.http.post(address, jsonData).subscribe((response: any) => {
      console.log(response);
    });
  }

  // 更改用户状态为在线
  turnToInline() {
    // 1.创建地址并打包数据
    const address = this.host + ':' + this.port + '/turnToInline';
    const jsonData = `{"name":"` + this.loginData.name + `","password":"` +
      this.loginData.password + `","id":` + this.loginData.uid + `}`;

    // 2.发送数据并设置回调函数
    this.http.post(address, jsonData).subscribe((response: any) => {
      console.log(response);
    });
  }

  //  发送图片函数
  sendPhoto() {
    const imgFile = document.getElementById('imgFile') as HTMLInputElement;

    // 判断图片是否为空
    if (imgFile.files[0] === undefined) {
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(imgFile.files[0]);
    reader.onload = () => {
      // 1.进行base64的转换
      const imgBase64 = reader.result as string;

      // 2.创建地址,并进行json数据打包
      const address = this.host + ':' + this.port + '/sendPhoto';

      // ID			int		`json:"id"`
      // Name		string	`json:"name"`
      // Password	string 	`json:"password"`
      // Target 		int 	`json:"target"`
      // Img 		string 	`json:"img"`
      const jsonData = `{` +
        `"name":"` + this.loginData.name +
        `","password":"` + this.loginData.password +
        `","id":` + this.loginData.uid +
        `,"target":` + this.chatId +
        `,"img":"` + imgBase64 +
        `"}`;

      // 3.进行数据的传送
      this.http.post(address, jsonData).subscribe((response) => {
        console.log('传送图片返回的响应');
        console.log(response);

        // 4.进行聊天信息图片的添加
        this.messageData.push({
          sender: this.loginData.uid,
          receiver: this.chatId,
          time: this.getTimeNow(),
          type: '1',
          msg: imgBase64
        });
        this.imgName = '未选择图片';
        // for IE, Opera, Safari, Chrome
        if (imgFile.outerHTML) {
          // 重新初始化
          imgFile.outerHTML = imgFile.outerHTML;
        } else { // FF(包括3.5)
          imgFile.value = '';
        }
        this.scrollToBottom();
      });
    };
  }

  //  发送图片按钮改变时出发的函数
  inputFileChange() {
    const inputFileTarget = document.getElementById('imgFile') as HTMLInputElement;
    if (inputFileTarget.files[0] === undefined) {
      this.imgName = '未选择图片';
      return;
    }
    this.imgName = '图片名:' + inputFileTarget.files[0].name + ';待发送';
  }

  // ***********************************菜单栏************
  // 改变用户状态
  changeStatus() {
    if (this.userStatus === '1') {
      this.userStatus = '0';
      this.turnToOffline();
    } else {
      this.userStatus = '1';
      this.turnToInline();
    }
  }

  // 注销
  clearCookieAndLogout() {
    this.cookieService.delete('name');
    this.cookieService.delete('ps');
    this.cookieService.delete('uid');

    this.router.navigate(['/login']).then(r => {});
  }

  //  退出
  logout() {
    this.router.navigate(['/login']).then(r => {});
  }

  //  异常退出
  closeChat() {
    this.router.navigate(['/login']).then(() => {});
  }
}
