import {Component, OnInit} from '@angular/core';
import {CookieService} from 'ngx-cookie-service';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  // 记录当前主机地址,端口号
  public host = 'http://193.112.248.246';
  public port = '8080';

  // 这个对象用来保存登录数据
  private loginData: any = {
    uid: -1,
    name: '',
    password: ''
  };

  // 储存用户信息的长度
  private manLength = 0;

  // 储存用户信息的数组
  private man: any[] = [];

  // 添加的记录添加的用户是否有权限
  private newUserHavePower = false;

  // 绑定操作的状态
  private changeStatus = '还未修改';

  //  储存当前修改用户的信息
  private changeManData: any = {
    id: 0,
    name: '',
    tel: '',
    email: '',
    password: ''
  };

  //  储存当前添加用户的信息
  private addUserData: any = {
    na: '',
    tel: '',
    email: '',
    ps: '',
    power: ''
  };

  constructor(public cookieService: CookieService, public router: Router, public http: HttpClient) {
  }

  ngOnInit() {
    // 进行loginData对象的初始化
    this.initLoginData();
    // 再次进行密码的判断,以免承受攻击
    this.checkLogin();
    // 进行用户数据的获取
    this.initMan();

  }

  // 初始化用户登录数据
  initLoginData() {
    this.loginData.uid = this.cookieService.get('uid');
    this.loginData.name = this.cookieService.get('name');
    this.loginData.password = this.cookieService.get('ps');

    // 检查异常登录
    if (this.loginData.uid === '' || this.loginData.name === '' || this.loginData.password === '') {
      this.closeChat();
    }
  }

  // 再次进行密码的判断,以免承受攻击
  checkLogin() {
    // 1.生成地址
    const address = this.host + ':' + this.port + '/adminLoginCheck';
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
        console.log('正确登录');
        return;
      } else {
        this.closeChat();
      }
    });
  }

  //  异常退出
  closeChat() {
    this.router.navigate(['/login']).then(() => {
    });
  }

  //  加载用户
  initMan() {
    // 1.创建地址
    const address = this.host + ':' + this.port + '/adminGetMan';

    // 2.创建发送数据
    const jsonData = `{"name":"` + this.loginData.name + `","password":"` + this.loginData.password + `","id":` + this.loginData.uid + `}`;

    // 3.进行发送数据
    this.http.post(address, jsonData).subscribe((response: any) => {
      //  Length	int		`json:"length"`
      //  ID		[MAXUSERNUM]int		`json:"id"`
      //  Name	[MAXUSERNUM]string	`json:"name"`
      //  Tel		[MAXUSERNUM]string 	`json:"tel"`
      //  Email	[MAXUSERNUM]string 	`json:"email"`
      //  Status 	[MAXUSERNUM]string 	`json:"status"`
      //  Power 	[MAXUSERNUM]string 	`json:"power"`
      //  Time 	[MAXUSERNUM]string 	`json:"time"`
      // A.进行长度的获取
      this.manLength = response.length;

      this.man = [];
      // B.进行用户数组的初始化
      for (let i = 0; i < this.manLength; i++) {
        this.man.push({
          id: response.id[i],
          name: response.name[i],
          tel: response.tel[i],
          email: response.email[i],
          status: response.status[i],
          power: response.power[i],
          time: response.time[i]
        });
      }
    });
  }

  //  用户点击修改时,初始化当前的结构,然后弹窗
  showChangeMenu(id: number, name: string, tel: string, email: string) {
    // 1.改变当前目标的信息
    this.changeManData = {id, name, tel, email};

    // 2.弹出操作菜单
    const shield = document.getElementById('shield') as HTMLDivElement;
    const shieldMenu = document.getElementById('shieldMenu') as HTMLDivElement;
    shield.style.display = 'block';
    shieldMenu.style.display = 'block';
  }

  //  点击添加用户的时候展现添加用户菜单
  showAddUserMenu() {
    const shield = document.getElementById('shield') as HTMLDivElement;
    const shieldMenu = document.getElementById('addUserShieldMenu') as HTMLDivElement;
    shield.style.display = 'block';
    shieldMenu.style.display = 'block';
  }

  //  用户点击修改时的触发函数
  adminChangeUserMessage() {
    // 1.创建地址
    const address = this.host + ':' + this.port + '/adminChangeManMessage';

    // 2.创建发送的数据
    //  ID       int    `json:"id"`
    //  Name     string `json:"name"`
    //  Password string `json:"password"`
    //  Target 	 int	`json:"target"`
    //  Tel		 string `json:"tel"`
    //  Email	 string `json:"email"`
    //  Ps 		 string	`json:"ps"
    const jsonData = `{"name":"` + this.loginData.name +
      `","password":"` +
      this.loginData.password +
      `","id":` +
      this.loginData.uid +
      `,"target":` +
      this.changeManData.id +
      `,"tel":"` +
      this.changeManData.tel +
      `","email":"` +
      this.changeManData.email +
      `","ps":"` +
      this.changeManData.password +
      `"}`;

    // 3.发送数据并订阅返回
    this.http.post(address, jsonData).subscribe((response: any) => {
      this.changeStatus = response.status;
      if (response.status === 'ok') {
        this.initMan();
        setTimeout(() => {
          this.closeChangeMenu();
        }, 500);
      }
    });
  }

  //  关闭弹出菜单
  closeChangeMenu() {
    this.changeStatus = '还未修改';
    const shield = document.getElementById('shield') as HTMLDivElement;
    const shieldMenu = document.getElementById('shieldMenu') as HTMLDivElement;
    shield.style.display = 'none';
    shieldMenu.style.display = 'none';
  }

  //  关闭添加用户菜单
  closeChangeAddUserMenu() {
    this.changeStatus = '还未修改';
    const shield = document.getElementById('shield') as HTMLDivElement;
    const shieldMenu = document.getElementById('addUserShieldMenu') as HTMLDivElement;
    shield.style.display = 'none';
    shieldMenu.style.display = 'none';
  }

  //  添加用户函数
  adminAddUser() {
    // 0.检查输入
    if (this.addUserData.na === '' || this.addUserData.tel === '' || this.addUserData.email === '' ||
    this.addUserData.ps === '') {
      alert('请检查输入！');
      return;
    }

    // 1.生成地址
    const address = this.host + ':' + this.port + '/adminCreateUser';

    // 2.生成json数据
    // ID       int    `json:"id"`
    // Name     string `json:"name"`
    // Password string `json:"password"`
    // Na		 string `json:"na"`
    // Tel		 string `json:"tel"`
    // Email	 string `json:"email"`
    // Ps 		 string	`json:"ps"`
    // Power	 string `json:"power"`
    if (this.newUserHavePower) {
      this.addUserData.power = '1';
    } else {
      this.addUserData.power = '0';
    }

    const jsonData = `{"name":"` +
      this.loginData.name +
      `","password":"` +
      this.loginData.password +
      `","id":` +
      this.loginData.uid +
      `,"na":"` +
      this.addUserData.na +
      `","tel":"` +
      this.addUserData.tel +
      `","email":"` +
      this.addUserData.email +
      `","ps":"` +
      this.addUserData.ps +
      `","power":"` +
      this.addUserData.power +
      `"}`;

    // 3.发送数据并进行回调函数
    this.http.post(address, jsonData).subscribe((response: any) => {
      this.changeStatus = response.status;
      if (response.status === 'ok') {
        this.initMan();
        setTimeout(() => {
          this.closeChangeAddUserMenu();
          this.changeStatus = '还未修改';
        }, 500);
      }
    });
  }

  // 设置权限，还是采用按一下就变为相反值的方法
  turnAddUserPower() {
    this.newUserHavePower = !this.newUserHavePower;
  }

  // 删除用户函数
  adminDeleteUser() {
    // 1.创建地址
    const address = this.host + ':' + this.port + '/adminDeleteUser';

    // 2.创建发送的数据
    // ID       int    `json:"id"`
    // Name     string `json:"name"`
    // Password string `json:"password"`
    // Target 	 int 	`json:"target"`
    const jsonData = `{"name":"` + this.loginData.name +
      `","password":"` +
      this.loginData.password +
      `","id":` +
      this.loginData.uid +
      `,"target":` +
      this.changeManData.id +
      `}`;

    // 3.发送数据并订阅返回
    this.http.post(address, jsonData).subscribe((response: any) => {
      this.changeStatus = response.status;
      if (response.status === 'ok') {
        this.initMan();
        setTimeout(() => {
          this.closeChangeMenu();
        }, 500);
      }
    });
  }

  //  退出
  logout() {
    this.cookieService.delete('name');
    this.cookieService.delete('ps');
    this.cookieService.delete('uid');

    this.router.navigate(['/login']).then(r => {});
  }
}
