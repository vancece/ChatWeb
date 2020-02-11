package main

// 引入所需要的库文件
import (
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	_ "github.com/bmizerany/pq"
	//_ "./pq"
	"io/ioutil"
	"net/http"
	"strconv"
)

// 决定了能聊天的最大人数
const MAXUSERNUM int = 25

// 决定了最大能显示的消息数量
const MAXMESSAGENUM int = 50

// 决定了轮巡中最大能返回的消息数量,因为轮巡时间较短,可以设置小点,减少数据流量
const MAXMSGINONETIME int = 5

// 注册使用到的结构
type registerData struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Tel      string `json:"tel"`
	Password string `json:"password"`
}

// 登录使用到的结构
type loginData struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

// 返回时使用到的结构
type fallbackData struct {
	Status string `json:"status"`
}

// 登录返回时使用到的结构
type LoginFallbackData struct {
	Status int    `json:"status"`
	Uid    int    `json:"uid"`
	Pas    string `json:"pas"`
}

// 发送联系人信息时使用的结构
type linkmanData struct {
	Length int                `json:"length"`
	ID     [MAXUSERNUM]int    `json:"id"`
	Name   [MAXUSERNUM]string `json:"name"`
	Status [MAXUSERNUM]string `json:"status"`
	Unread [MAXUSERNUM]string `json:"unread"`
}

// 接收聊天信息的数据结构
type chatMessageData struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Receiver int    `json:"receiver"`
	Message  string `json:"message"`
}

// 请求接收指定ID发送给他的消息时使用到的结构
type receiveRequireTargetChatData struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Target   int    `json:"target"`
}

// 发送聊天信息时使用到的结构
type chatData struct {
	Length   int                   `json:"length"`
	Ltime    string                `json:"ltime"`
	Sender   [MAXMESSAGENUM]string `json:"sender"`
	Receiver [MAXMESSAGENUM]string `json:"receiver"`
	Time     [MAXMESSAGENUM]string `json:"time"`
	Type     [MAXMESSAGENUM]string `json:"type"`
	Msg      [MAXMESSAGENUM]string `json:"msg"`
}

// 发送新聊天信息时使用到的结构
type feedBackNewChatMsgData struct {
	Length   int                     `json:"length"`
	Sender   [MAXMSGINONETIME]string `json:"sender"`
	Receiver [MAXMSGINONETIME]string `json:"receiver"`
	Time     [MAXMSGINONETIME]string `json:"time"`
	Type     [MAXMSGINONETIME]string `json:"type"`
	Msg      [MAXMSGINONETIME]string `json:"msg"`
}

//	请求改变消息状态是使用到的结构
type changeReadStatusData struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Sender   int    `json:"sender"`
}

//	获取新消息时传送来数据使用到的结构
type getNewMessageData struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Target   int    `json:"target"`
}

//	返回注册时使用到的结构
type feedBackRegisterData struct {
	ID       int    `json:"id"`
	Password string `json:"password"`
}

//	接收发送图片请求使用到的结构
type sendPhotoData struct {
	ID			int		`json:"id"`
	Name		string	`json:"name"`
	Password	string 	`json:"password"`
	Target 		int 	`json:"target"`
	Img 		string 	`json:"img"`
}

//	用户管理返回所有用户信息用到的结构
type feedBackAdminGetMan struct {
	Length	int		`json:"length"`
	ID		[MAXUSERNUM]int		`json:"id"`
	Name	[MAXUSERNUM]string	`json:"name"`
	Tel		[MAXUSERNUM]string 	`json:"tel"`
	Email	[MAXUSERNUM]string 	`json:"email"`
	Status 	[MAXUSERNUM]string 	`json:"status"`
	Power 	[MAXUSERNUM]string 	`json:"power"`
	Time 	[MAXUSERNUM]string 	`json:"time"`
}

//	用户管理修改用户的信息接收使用到的结构
type receiveToChangeUserMessage struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Target 	 int	`json:"target"`
	Tel		 string `json:"tel"`
	Email	 string `json:"email"`
	Ps 		 string	`json:"ps"`
}

//	用户管理添加用户的接收结构
type receiveToCreateUser struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Na		 string `json:"na"`
	Tel		 string `json:"tel"`
	Email	 string `json:"email"`
	Ps 		 string	`json:"ps"`
	Power	 string `json:"power"`
}

//	用户管理删除用户的接收结构
type receiveToDeleteUser struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Target 	 int 	`json:"target"`
}

// ---------------数据库公共对象------------------------
var Db *sql.DB

// ***********************************************************************************//

// ---------------处理错误公共函数----------------------
func processError(err error) bool {
	if err != nil {
		fmt.Println("发生错误了：", err)
		panic(err)
		return true
	}

	return false
}

// ---------------允许跨域设置公共函数------------------
func orc(w http.ResponseWriter, r *http.Request) {
	if origin := r.Header.Get("Origin"); origin != "" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers",
			"Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
	}
	w.Header().Set("Content-Type", "application/json")

}

// ---------------检查嗅探公共函数----------------------
func isSniff(r *http.Request) (status bool)  {
	status = r.Method == "OPTIONS"
	return
}

// ---------------登录检查公共函数----------------------
func loginCheck(lData *loginData) (check bool) {
	fmt.Println("Login Check...")

	// 1.进行数据库查询
	query := "SELECT password FROM userMessage WHERE id = " + strconv.Itoa(lData.ID) + " AND name = '" + lData.Name + "';"

	// 2.对结果进行处理
	rows, err := Db.Query(query)
	if processError(err) {
		return
	}
	defer rows.Close()

	// 3.获取数据
	rows.Next()
	var password string
	err = rows.Scan(&password)

	// 4.进行检查
	if err != nil {
		return false
	} else if password == lData.Password {
		return true
	}
	return false
}

// ---------------管理员登录检查公共函数-----------------
func adminCheck(lData *loginData) (bool) {
	fmt.Println("Admin Check...")

	// 1.进行登录信息的验证
	isRight := loginCheck(lData)

	// 2.进行权限查询
	power := getPower(lData)

	if isRight && power {
		return true
	}

	return false
}

// ---------------索取权限公共函数----------------------
func getPower(lData *loginData) (check bool) {
	fmt.Println("Get Power...")

	// 1.进行数据库查询
	query := "SELECT power FROM userMessage WHERE id = " + strconv.Itoa(lData.ID) + " AND name = '" + lData.Name + "';"

	// 2.对结果进行处理
	rows, err := Db.Query(query)
	if processError(err) {
		return
	}
	defer rows.Close()

	// 3.获取数据
	rows.Next()
	var power string
	err = rows.Scan(&power)

	// 4.进行检查
	if err != nil {
		return false
	} else if power == "1" {
		return true
	}
	return false
}

// ---------------MD5加密函数--------------------------
func md5Encode(s string) string {
	m := md5.Sum([]byte (s))
	return hex.EncodeToString(m[:])
}

// ---输入目标id,获取最后一次登录时间---------------------
func getLastLoginTime(target int) (time string) {
	fmt.Println("Get Last Login Time...")

	// 1.创建数据库连接,并进行查询
	rows, err := Db.Query("SELECT last_login_time FROM usermessage WHERE id = $1 LIMIT 1", target)
	processError(err)
	defer rows.Close()

	// 2.进行数据的获取
	rows.Next()
	_ = rows.Scan(&time)
	return
}

// 初始化数据库连接
func initDb() {
	fmt.Println("Init Db...")

	var err error
	Db, err = sql.Open("postgres", "host=172.17.0.1 user=postgres port=54321 password=season dbname=data sslmode=disable")
	processError(err)
}

// 注册的辅助函数
func registers(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Register...")

	if isSniff(r) {
		return
	}

	// 0.设置跨域
	orc(w, r)

	// 1.创建一个结构来保存
	rData := registerData{}

	// 2.创建一个结构来保存返回数据
	fBRD := feedBackRegisterData{}

	// 3.获取post数据
	body, err := ioutil.ReadAll(r.Body)
	if processError(err) {
		return
	}
	fmt.Println("body:")
	fmt.Println(string(body))

	// 4.进行初始化注册结构
	err = json.Unmarshal(body, &rData)
	processError(err)

	// 5.对密码进行MD5加密!
	rData.Password = md5Encode(rData.Password)

	// 6.进行数据的上传
	var id = 0
	stmt, err := Db.Prepare("INSERT INTO usermessage (name, email, tel, password, status, power, last_login_time, ill) VALUES ($1, $2, $3, $4, '1', '0',now(), '0') RETURNING id")
	processError(err)
	defer stmt.Close()
	err = stmt.QueryRow(rData.Name, rData.Email, rData.Tel, rData.Password).Scan(&id)
	processError(err)

	fmt.Println("得到id:", id)

	// 7.进行返回结构的初始化
	//	ID 			int		`json:"id"`
	//	Password 	string 	`json:"password"`
	fBRD.ID = id
	fBRD.Password = rData.Password

	// 8.返回数据
	w.Header().Set("Content-Type", "application/json")
	result, err := json.Marshal(fBRD)
	processError(err)
	fmt.Println(string(result))
	_, _ = fmt.Fprintln(w, string(result))

	return
}
	
// 用户登录,并且检测辅助函数,返回id和密码
func loginSearch(name string) (id int, password string) {
	fmt.Println("LoginSearch...")

	//进行查询
	result, err := Db.Query("SELECT id,password FROM userMessage where name='" + name + "' limit 1;")
	if processError(err) {
		return
	}
	defer result.Close()

	//获取返回的数据
	result.Next()
	err = result.Scan(&id, &password)
	// 找不到用户
	if err != nil {
		return -1, ""
	}
	return
}

// 获取用户登录数据并登录
func hLogin(w http.ResponseWriter, r *http.Request) {
	fmt.Println("hLogin...")

	if isSniff(r) {
		return
	}

	// 1.创建一个结构来保存
	lData := loginData{}

	// 2.获取post数据
	body, err := ioutil.ReadAll(r.Body)
	if processError(err) {
		return
	}

	//3.进行解码
	err = json.Unmarshal(body, &lData)
	if processError(err) {
		return
	}

	//4.对密码进行MD5加密!
	lData.Password = md5Encode(lData.Password)

	//5.状态获取
	id, password := loginSearch(lData.Name)

	//6.进行判断
	status := 3
	if id == -1 && password == "" {
		//用户名错误
		status = 2
	} else if password != lData.Password {
		//密码错误
		status = 1
	} else if password == lData.Password {
		//用户名、密码正确
		status = 0
	}

	//7.进行头部设置,使其可以跨域
	orc(w, r)

	//8.返回数据
	//	A.0 :登录成功
	//	B.1 :密码错误
	//	C.2 :没有该用户
	w.Header().Set("Content-Type", "application/json")
	var sender = LoginFallbackData{}
	if status == 0 {
		// 登录成功
		sender = LoginFallbackData{
			Status: status,
			Uid:    id,
			Pas:    lData.Password,
		}
	} else if status == 1 || status == 2 {
		// 密码错误或者没有该用户
		sender = LoginFallbackData{
			Status: status,
			Uid:    -1,
			Pas:    "",
		}
	}
	result, err := json.Marshal(sender)
	if processError(err) {
		return
	}
	_, _ = fmt.Fprintln(w, string(result))
	return
}

// 在用户进入聊天页面的时候,开始进行检测用户名的密码是否正确
func weChatLoginCheck(w http.ResponseWriter, r *http.Request) {
	fmt.Println("WeChat LoginCheck...")

	if isSniff(r) {
		return
	}

	// 1.创建一个结构来保存传过来的而数据
	lData := loginData{}

	// 2.允许跨域的设置
	orc(w, r)

	// 3.开始进行数据的处理
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return
	}

	// 4.进行解码
	err = json.Unmarshal(body, &lData)
	if processError(err) {
		return
	}

	// 6.进行数据库查询
	isRight := loginCheck(&lData)

	// 7.如果找不到数据,或者密码不正确的话
	// 	这个一般只在非法访问的时候出现
	w.Header().Set("Content-Type", "application/json")
	var sender fallbackData
	if !isRight {
		sender = fallbackData{
			"ill",
		}

	} else {
		// 如果检测密码正确的话
		sender = fallbackData{
			"ok",
		}
	}

	// 进行数据返回
	result, err := json.Marshal(sender)
	if processError(err) {
		return
	}
	_, _ = fmt.Fprintln(w, string(result))

	return
}

// 验证登录信息,并返回联系人的数据
func getLinkman(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Get Linkman...")

	if isSniff(r) {
		return
	}

	// ***** 一 *****************************************
	// 1.创建一个结构来保存传过来的数据
	lData := loginData{}

	// 2.允许跨域的设置
	orc(w, r)

	// 3.开始进行数据的处理
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return
	}

	// 4.进行解码
	err = json.Unmarshal(body, &lData)
	if processError(err) {
		return
	}

	// 5.进行数据库查询
	isRight := loginCheck(&lData)
	if !isRight {
		return
	}

	// ***** 二 *****************************************
	// 1.构建储存联系人的结构
	//	Length int                `json:"length"`
	//	ID     [MAXUSERNUM]int    `json:"id"`
	//	Name   [MAXUSERNUM]string `json:"name"`
	//	Status [MAXUSERNUM]string `json:"status"`
	//	Unread [MAXUSERNUM]string `json:"unread"`
	var linkman = linkmanData{}

	// 2.进行数据库查询操作,设置联系人数组
	rows, err := Db.Query("SELECT id, name, status FROM usermessage ORDER BY last_login_time DESC LIMIT " + strconv.Itoa(MAXUSERNUM) + ";")
	if processError(err) {
		return
	}
	defer rows.Close()

	var index = 0
	for rows.Next() {
		err := rows.Scan(&linkman.ID[index], &linkman.Name[index], &linkman.Status[index])
		if processError(err) {
			return
		}
		index++
	}

	linkman.Length = index

	// 3.进行未读信息的获取
	for index, target := range linkman.ID {
		if linkman.ID[index] == 0 {
			break
		}
		var id int
		err := Db.QueryRow("SELECT id FROM message WHERE sender = " + strconv.Itoa(target) + " AND receiver= " + strconv.Itoa(lData.ID) + " AND status= '1' LIMIT 1;").Scan(id)
		if err == sql.ErrNoRows {
			linkman.Unread[index] = "0"
		} else{
			linkman.Unread[index] = "1"
		}
		rows.Close()
	}

	// 4.发送数据
	result, err := json.Marshal(linkman)
	if processError(err) {
		return
	}

	_, err = fmt.Fprintln(w, string(result))
	if processError(err) {
		return
	}

	return
}

// 验证登录信息,并发送消息
func sendMessage(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Send Message...")

	if isSniff(r) {
		return
	}

	// 1.创建一个结构来保存传过来的数据
	sendData := chatMessageData{}

	// 2.创建一个登录结构来检查登录信息的正确性
	lData := loginData{}

	// 3.进行跨域设置
	orc(w, r)

	// 4.获取post传送的json的数据,对发送信息结构进行初始化
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return
	}

	err = json.Unmarshal(body, &sendData)
	if processError(err) {
		return
	}

	// 5.对登录结构进行初始化
	lData.ID = sendData.ID
	lData.Name = sendData.Name
	lData.Password = sendData.Password

	// 6.对登录信息正确性进行检测
	if !loginCheck(&lData) {
		return
	}

	// 7.如果正确通过检测的话,进行数据库聊天信息的插入
	//	ID       	int    	`json:"id"`
	//	Name     	string 	`json:"name"`
	//	Password 	string 	`json:"password"`
	//	Receiver	int		`json:"receiver"`
	//	Message 	string	`json:"message"`
	//		insert into message (sender,receiver,time,type,msg,status) values ('1','2',now(),'0','hello?','1');
	stmt, err := Db.Prepare(`INSERT INTO message (sender,receiver,time,type,msg,status) VALUES ($1,$2,now(),'0',$3,'1')`)
	if processError(err) {
		return
	}
	defer stmt.Close()
	_, err = stmt.Exec(strconv.Itoa(sendData.ID), strconv.Itoa(sendData.Receiver), sendData.Message)
	// 8.返回正确的信息
	fallback := fallbackData{
		Status: "ok",
	}

	result, err := json.Marshal(fallback)
	if processError(err) {
		return
	}

	_, err = fmt.Fprintln(w, string(result))
	if processError(err) {
		return
	}

	return
}

// 用户在进入聊天窗口的时候,传回所有取得的消息
func getMessage(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Get Message...")

	if isSniff(r) {
		return
	}

	// 0.进行跨域设置
	orc(w, r)

	// 1.建立接送消息结构
	requireData := receiveRequireTargetChatData{}

	// 2.进行消息的获取
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return
	}

	err = json.Unmarshal(body, &requireData)
	if processError(err) {
		return
	}

	// 3.建立并初始化loginData结构,进行登录检查
	lData := loginData{}
	lData.ID = requireData.ID
	lData.Name = requireData.Name
	lData.Password = requireData.Password
	if !loginCheck(&lData) {
		return
	}

	// 4. 创建一个返回数据的结构
	cData := chatData{}

	// 5.进行数据库查询
	//select time,type,msg,status,sender,receiver from message where (sender='2' and receiver='1') or (sender='1' and receiver='2');
	query := "SELECT sender,receiver,time,type,msg FROM message WHERE (sender = " + strconv.Itoa(requireData.Target) +
		" AND receiver = " + strconv.Itoa(requireData.ID) + ") OR (sender = " + strconv.Itoa(requireData.ID) + " AND receiver = " +
		strconv.Itoa(requireData.Target) + ") ORDER BY time DESC LIMIT " + strconv.Itoa(MAXMESSAGENUM) + ";"
	rows, err := Db.Query(query)
	if processError(err) {
		return
	}
	defer rows.Close()

	// 6.数据结构的初始化
	//	Length   int                   `json:"length"`
	//	Ltime	 string				   `json:"Ltime"`
	//	Sender   [MAXMESSAGENUM]string `json:"sender"`
	//	Receiver [MAXMESSAGENUM]string `json:"receiver"`
	//	Time     [MAXMESSAGENUM]string `json:"time"`
	//	Type     [MAXMESSAGENUM]string `json:"type"`
	//	Msg      [MAXMESSAGENUM]string `json:"msg"`
	//	sender,receiver,time,type,msg
	var index = 0
	for rows.Next() {
		err = rows.Scan(&cData.Sender[index], &cData.Receiver[index], &cData.Time[index], &cData.Type[index], &cData.Msg[index])
		if processError(err) {
			return
		}
		index++
	}
	cData.Length = index

	// 7.进行联系人最后一次登录时间的获取并赋值
	cData.Ltime = getLastLoginTime(requireData.Target)

	// 8.进行数据的打包
	jsonData, err := json.Marshal(cData)
	if processError(err) {
		return
	}

	// 9.进行数据的发送
	_, err = fmt.Fprintln(w, string(jsonData))
	if processError(err) {
		return
	}

	return
}

// 轮巡时查看的返回新的信息
func getNewMessage(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Get New Message...")

	if isSniff(r) {
		return
	}
	// 0.设置跨域
	orc(w, r)

	//	ID       int    `json:"id"`
	//	Name     string `json:"name"`
	//	Password string `json:"password"`
	//	Target 	 int    `json:"target"`

	// 1.创建结构存储传送来的结构
	getNewMsgData := getNewMessageData{}

	// 2.创建登录结构
	lData := loginData{}

	// 3.创建返回聊天信息的结构
	//	Length   int                   	 `json:"length"`
	//	Sender   [MAXMSGINONETIME]string `json:"sender"`
	//	Receiver [MAXMSGINONETIME]string `json:"receiver"`
	//	Time     [MAXMSGINONETIME]string `json:"time"`
	//	Type     [MAXMSGINONETIME]string `json:"type"`
	//	Msg      [MAXMSGINONETIME]string `json:"msg"`
	fBNCMD := feedBackNewChatMsgData{}

	// 4.对存储结构进行初始化
	body, err := ioutil.ReadAll(r.Body)
	processError(err)
	err = json.Unmarshal(body, &getNewMsgData)
	processError(err)

	// 5.对登录结构进行初始化
	lData.ID = getNewMsgData.ID
	lData.Name = getNewMsgData.Name
	lData.Password = getNewMsgData.Password

	// 6.进行登录检查
	if !loginCheck(&lData) {
		return
	}

	// 7.进行数据库查询有无新消息
	rows, err := Db.Query("SELECT id,sender,receiver,time,type,msg FROM message WHERE sender = $1 AND receiver = $2 AND status = '1' LIMIT $3;", getNewMsgData.Target, getNewMsgData.ID, MAXMSGINONETIME)
	processError(err)
	defer rows.Close()

	// 8.对将要返回的数据结构进行初始化
	//	Length   int                   	 `json:"length"`
	//	Sender   [MAXMSGINONETIME]string `json:"sender"`
	//	Receiver [MAXMSGINONETIME]string `json:"receiver"`
	//	Time     [MAXMSGINONETIME]string `json:"time"`
	//	Type     [MAXMSGINONETIME]string `json:"type"`
	//	Msg      [MAXMSGINONETIME]string `json:"msg"`
	//	sender,receiver,time,type,msg
	//	为了避免在获取数据后,有用户发送信息,程序再改变所有未读的信息为已读,采用以下方法
	var index = 0
	var tempId = 0
	for rows.Next() {
		err = rows.Scan(&tempId, &fBNCMD.Sender[index], &fBNCMD.Receiver[index], &fBNCMD.Time[index], &fBNCMD.Type[index], &fBNCMD.Msg[index])
		processError(err)

		rows, err := Db.Query("UPDATE message SET status = '0' WHERE id = $1", tempId)
		processError(err)
		rows.Close()
		index++
	}

	fBNCMD.Length = index

	// 9.返回数据
	result, err := json.Marshal(fBNCMD)
	processError(err)
	_, _ = fmt.Fprintln(w, string(result))
}

// 当用户点击联系人的时候,改变发送联系人所有消息的未读状态改成已读
func changeReadStatus(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Change Read Status...")
	if isSniff(r) {
		return
	}
	// 0.设置允许跨域
	orc(w, r)

	//	ID       int    `json:"id"`
	//	Name     string `json:"name"`
	//	Password string `json:"password"`
	//	Sender	 int 	`json:"sender"`

	// 1.接收传输过来的数据
	body, err := ioutil.ReadAll(r.Body)
	processError(err)

	// 2.创建接收数据的结构并进行初始化
	CRSData := changeReadStatusData{}
	err = json.Unmarshal(body, &CRSData)
	processError(err)

	// 3.验证登录信息
	lData := loginData{}
	lData.ID = CRSData.ID
	lData.Name = CRSData.Name
	lData.Password = CRSData.Password
	if !loginCheck(&lData) {
		return
	}
	// 4.更改数据库消息的状态
	rows, err := Db.Query("UPDATE message SET status = '0' WHERE sender= $1 AND receiver = $2 AND status = '1';",
		strconv.Itoa(CRSData.Sender), strconv.Itoa(CRSData.ID))

	processError(err)
	defer rows.Close()

	// 5.返回成功的消息
	fData := fallbackData{
		Status: "检查并改变信息状态ok",
	}

	result, err := json.Marshal(fData)
	processError(err)
	_, _ = fmt.Fprintln(w, string(result))
}

//	验证并修改用户状态为在线状态
func turnToInline(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Turn To Online...")
	if isSniff(r) {
		return
	}
	// 0.支持跨域
	orc(w, r)

	// 1.创建一个登录结构
	lData := loginData{}

	// 2.进行数据获取
	body, err := ioutil.ReadAll(r.Body)
	processError(err)
	err = json.Unmarshal(body, &lData)
	processError(err)

	// 3.进行登录验证
	if !loginCheck(&lData) {
		return
	}

	// 4.进行数据库操作
	rows, err := Db.Query("UPDATE usermessage SET status = '1' WHERE id = $1", lData.ID)
	processError(err)
	rows.Close()

	// 5.修改最后登录时间
	rows, err = Db.Query("UPDATE usermessage SET last_login_time = now() WHERE id = $1", lData.ID)
	processError(err)
	rows.Close()

	// 6.进行数据的返回
	fBData := fallbackData{
		Status: "更改在线状态完成!",
	}
	result, err := json.Marshal(fBData)
	processError(err)
	_, _ = fmt.Fprintln(w, string(result))
}

//	验证并修改用户状态为在线状态
func turnToOffline(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Turn To Offline...")
	if isSniff(r) {
		return
	}
	// 0.支持跨域
	orc(w, r)

	// 1.创建一个登录结构
	lData := loginData{}

	// 2.进行数据获取
	body, err := ioutil.ReadAll(r.Body)
	processError(err)
	err = json.Unmarshal(body, &lData)
	processError(err)

	// 3.进行登录验证
	if !loginCheck(&lData) {
		return
	}

	// 4.进行数据库操作
	rows, err := Db.Query("UPDATE usermessage SET status = '0' WHERE id = $1", lData.ID)
	processError(err)
	rows.Close()

	// 5.修改最后登录时间
	rows, err = Db.Query("UPDATE usermessage SET last_login_time = now() WHERE id = $1", lData.ID)
	processError(err)
	rows.Close()

	// 6.进行数据的返回
	fBData := fallbackData{
		Status: "更改在线状态完成!",
	}
	result, err := json.Marshal(fBData)
	processError(err)
	_, _ = fmt.Fprintln(w, string(result))
}

//	处理图片的上传
func sendPhoto(w http.ResponseWriter, r *http.Request)  {
	fmt.Println("Send Photo...")

	// 0.进行跨域的设置
	orc(w, r)

	// 1. 进行嗅探检测
	if isSniff(r) {
		return
	}

	// 2.如果不是嗅探,创建一个接收数据结构
	sPData := sendPhotoData{}

	// 3.进行数据获取
	body,err := ioutil.ReadAll(r.Body)
	processError(err)

	// 4.进行数据解析
	err = json.Unmarshal(body,&sPData)
	processError(err)

	// 5.创建登录结构并进行初始化
	lData := loginData{}
	lData.ID = sPData.ID
	lData.Name = sPData.Name
	lData.Password = sPData.Password

	// 6.进行登录状态的确认
	if !loginCheck(&lData) {
		fmt.Println("登录失败")
		return
	}

	// 7.进行数据库的存储
	rows,err := Db.Query("INSERT INTO message (sender, receiver, time, type, msg, status) VALUES ($1,$2,now(),'1',$3,'1')",
		sPData.ID,sPData.Target,sPData.Img)
	processError(err)
	defer rows.Close()

	// 8.进行状态的返回
	fBD := fallbackData{Status:"Successfully!"}
	result,err := json.Marshal(fBD)
	processError(err)
	_, _ = fmt.Fprintln(w, string(result))
}

//	自动登录处理
func autoLogin(w http.ResponseWriter,r *http.Request) {
	fmt.Println("Auto Login...")
	// 0.进行跨域设置
	orc(w, r)

	// 1.进行嗅探检测
	if isSniff(r){
		return
	}

	// 2.创建登录接收数据结构
	lData := loginData{}

	// 3.获取post数据
	body, err := ioutil.ReadAll(r.Body)
	if processError(err) {
		return
	}

	// 4.进行解码
	err = json.Unmarshal(body, &lData)
	if processError(err) {
		return
	}

	// 5.登录检查
	//	1.错误
	//	0.正确
	var passCheck = 1
	if loginCheck(&lData) {
		passCheck = 0
	}

	// 6.创建返回结构
	fBD := fallbackData{
		Status:strconv.Itoa(passCheck),
	}

	// 7.返回数据
	result, err := json.Marshal(fBD)
	if processError(err) {
		return
	}
	_, _ = fmt.Fprintln(w, string(result))

	return
}

//	管理员登录处理函数
func adminLogin(w http.ResponseWriter,r *http.Request) {
	fmt.Println("Admin Login...")
	// 1 进行跨域设置
	orc(w, r)

	// 2 进行嗅探查询
	if isSniff(r) {
		return
	}

	// 3.创建一个结构来保存
	lData := loginData{}

	// 4.获取post数据
	body, err := ioutil.ReadAll(r.Body)
	if processError(err) {
		return
	}

	// 5.进行解码
	err = json.Unmarshal(body, &lData)
	if processError(err) {
		return
	}

	// 6.对密码进行MD5加密!
	lData.Password = md5Encode(lData.Password)

	//5.状态获取
	id, password := loginSearch(lData.Name)

	//6.进行判断
	status := 3
	if id == -1 && password == "" {
		//用户名错误
		status = 2
	} else if password != lData.Password {
		//密码错误
		status = 1
	} else if password == lData.Password {
		//用户名、密码正确
		status = 0
	}


	// 7.对lData的id赋值
	lData.ID = id

	// 8.进行权限检查
	if status == 0 && !getPower(&lData) {
		status = 2
	}

	// 9.返回数据
	//	A.0 :登录成功
	//	B.1 :密码错误
	//	C.2 :没有该用户
	var sender = LoginFallbackData{}
	if status == 0 {
		// 登录成功
		sender = LoginFallbackData{
			Status: status,
			Uid:    id,
			Pas:    lData.Password,
		}
	} else if status == 1 || status == 2 {
		// 密码错误或者没有该用户
		sender = LoginFallbackData{
			Status: status,
			Uid:    -1,
			Pas:    "",
		}
	}
	result, err := json.Marshal(sender)
	if processError(err) {
		return
	}
	_, _ = fmt.Fprintln(w, string(result))
	return
}

//	登录检查函数
func adminLoginCheck(w http.ResponseWriter,r *http.Request) {
	fmt.Println("Admin Login Check...")
	// 1.创建一个结构来保存传过来的而数据
	lData := loginData{}

	// 2.允许跨域的设置
	orc(w, r)

	// 2.5
	if isSniff(r) {
		return
	}

	// 3.开始进行数据的处理
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		return
	}

	// 4.进行解码
	err = json.Unmarshal(body, &lData)
	if processError(err) {
		return
	}

	// 6.进行数据库查询
	isRight := loginCheck(&lData)

	// 6.5进行权限查询
	power := getPower(&lData)

	// 7.如果找不到数据,或者密码不正确的话
	// 	这个一般只在非法访问的时候出现
	w.Header().Set("Content-Type", "application/json")
	var sender fallbackData
	if !isRight || !power {
		sender = fallbackData{
			"ill",
		}

	} else {
		// 如果检测密码正确的话
		sender = fallbackData{
			"ok",
		}
	}

	// 进行数据返回
	result, err := json.Marshal(sender)
	if processError(err) {
		return
	}
	_, _ = fmt.Fprintln(w, string(result))

	return
}

//	管理员获取用户数据
func adminGetMan(w http.ResponseWriter,r *http.Request) {
	// 0.进行跨域设置
	orc(w, r)

	// 1.进行嗅探检查
	if isSniff(r) {
		return
	}

	// 2.创建一个结构用来接收数据
	lData := loginData{}

	// 3.对创建的结构进行初始化
	body,err := ioutil.ReadAll(r.Body)
	processError(err)
	err = json.Unmarshal(body,&lData)
	processError(err)

	// 4.进行登录检查
	if !adminCheck(&lData) {
		return
	}

	// 5.创建一个返回数组
	//	Length	int		`json:"length"`
	//	ID		[MAXUSERNUM]int		`json:"id"`
	//	Name	[MAXUSERNUM]string	`json:"name"`
	//	Tel		[MAXUSERNUM]string 	`json:"tel"`
	//	Email	[MAXUSERNUM]string 	`json:"email"`
	//	Status 	[MAXUSERNUM]string 	`json:"status"`
	//	Power 	[MAXUSERNUM]string 	`json:"power"`
	//	Time 	[MAXUSERNUM]string 	`json:"time"`
	fBAGM := feedBackAdminGetMan{}

	// 6.进行数据查询
	rows,err := Db.Query("SELECT id,name,tel,email,status,power,last_login_time FROM usermessage ORDER BY id LIMIT $1",MAXUSERNUM)
	processError(err)
	defer rows.Close()

	// 7.进行数据的获取
	var i = 0
	for rows.Next() {
		err = rows.Scan(&fBAGM.ID[i],&fBAGM.Name[i],&fBAGM.Tel[i],&fBAGM.Email[i],&fBAGM.Status[i],&fBAGM.Power[i],&fBAGM.Time[i])
		processError(err)
		i++
	}
	fBAGM.Length = i

	// 8.进行数据的返回
	result,err := json.Marshal(fBAGM)
	processError(err)
	_, _ = fmt.Fprintln(w, string(result))
	return
}

//	管理员修改用户信息
func adminChangeManMessage(w http.ResponseWriter, r *http.Request) {
	// 1.设置跨域
	orc(w, r)

	// 2.嗅探检测
	if isSniff(r) {
		return
	}

	// 3.初始化结构结构
	//	ID       int    `json:"id"`
	//	Name     string `json:"name"`
	//	Password string `json:"password"`
	//	Target 	 int	`json:"target"`
	//	Tel		 string `json:"tel"`
	//	Email	 string `json:"email"`
	//	Ps 		 string	`json:"ps"`
	receiverData := receiveToChangeUserMessage{}
	body,err := ioutil.ReadAll(r.Body)
	processError(err)
	err = json.Unmarshal(body,&receiverData)
	processError(err)


	// 3.5进行登录验证
	lData := loginData{
		ID:       receiverData.ID,
		Name:     receiverData.Name,
		Password: receiverData.Password,
	}
	if !adminCheck(&lData) {
		return
	}

	// 4.5.如果密码为空,就不修改密码
	if receiverData.Ps == "undefined" {
		fmt.Println("密码为空")
		// 4.25对数据库进行修改
		rows,err := Db.Query("UPDATE usermessage SET tel = $1, email = $2 WHERE id = $3",
			receiverData.Tel,receiverData.Email,receiverData.Target)
		processError(err)
		defer rows.Close()
	} else {
		// 5.如果密码为空,就修改密码
		fmt.Println("密码不为空")
		receiverData.Password = md5Encode(receiverData.Password)
		// 4.75对数据库进行修改
		rows,err := Db.Query("UPDATE usermessage SET tel = $1, email = $2,password = $3 WHERE id = $4",
			receiverData.Tel,receiverData.Email,receiverData.Password,receiverData.Target)
		processError(err)
		defer rows.Close()
	}

	// 6.进行数据的返回
	fBD := fallbackData{Status:"ok"}
	result,err := json.Marshal(fBD)

	_, _ = fmt.Fprintln(w, string(result))
}

//	管理员创建用户
func adminCreateUser(w http.ResponseWriter, r *http.Request) {
	// １,设置跨域
	orc(w, r)

	// 2.检测嗅探
	if isSniff(r) {
		return
	}

	// 3．创建并初始化接收结构
	//	ID       int    `json:"id"`
	//	Name     string `json:"name"`
	//	Password string `json:"password"`
	//	Na		 string `json:"na"`
	//	Tel		 string `json:"tel"`
	//	Email	 string `json:"email"`
	//	Ps 		 string	`json:"ps"`
	//	Power	 string `json:"power"`
	receiverData := receiveToCreateUser{}
	body,err := ioutil.ReadAll(r.Body)
	processError(err)
	err = json.Unmarshal(body,&receiverData)
	processError(err)

	// 3.5进行管理员登录验证
	lData := loginData{
		ID:       receiverData.ID,
		Name:     receiverData.Name,
		Password: receiverData.Password,
	}
	if !adminCheck(&lData) {
		return
	}

	// 4.进行数据库操作
	receiverData.Ps = md5Encode(receiverData.Ps)
	rows,err := Db.Query("INSERT INTO usermessage (name, email, tel, password, status, ill, power, last_login_time) "+
		"VALUES ($1,$2,$3,$4,'0','0',$5,now())",
		receiverData.Na,receiverData.Email,receiverData.Tel,receiverData.Ps,receiverData.Power)
	processError(err)
	defer rows.Close()

	// 5.进行返回结构的创建并返回
	fBD := fallbackData{Status:"ok"}
	result,err := json.Marshal(fBD)
	_,_ = fmt.Fprintln(w, string(result))
}

//	最后一个函数，删除用户
func adminDeleteUser(w http.ResponseWriter,r *http.Request) {
	// １,设置跨域
	orc(w, r)

	// 2.检测嗅探
	if isSniff(r) {
		return
	}

	// 3．创建并初始化接收结构
	//	ID       int    `json:"id"`
	//	Name     string `json:"name"`
	//	Password string `json:"password"`
	//	Target 	 int 	`json:"target"`
	receiverData := receiveToDeleteUser{}
	body,err := ioutil.ReadAll(r.Body)
	processError(err)
	err = json.Unmarshal(body,&receiverData)
	processError(err)

	// 4.进行管理员身份认证
	lData := loginData{
		ID:       receiverData.ID,
		Name:     receiverData.Name,
		Password: receiverData.Password,
	}
	if !adminCheck(&lData) {
		return
	}

	// 4.进行数据库操作
	rows,err := Db.Query("DELETE FROM usermessage WHERE id = $1",receiverData.Target)
	processError(err)
	defer rows.Close()

	// 5.进行返回结构的创建并返回
	fBD := fallbackData{Status:"ok"}
	result,err := json.Marshal(fBD)
	_,_ = fmt.Fprintln(w, string(result))
}

// 主函数
func main() {
	fmt.Println("vancece.com's service running...")
	initDb()
	service := http.Server{
		Addr:              ":8080",
		Handler:           nil,
	}

	http.HandleFunc("/register", registers)
	http.HandleFunc("/login", hLogin)
	http.HandleFunc("/weChatLoginCheck", weChatLoginCheck)
	http.HandleFunc("/getLinkman", getLinkman)
	http.HandleFunc("/sendMessage", sendMessage)
	http.HandleFunc("/getMessage", getMessage)
	http.HandleFunc("/getNewMessage", getNewMessage)
	http.HandleFunc("/changeReadStatus", changeReadStatus)
	http.HandleFunc("/turnToInline", turnToInline)
	http.HandleFunc("/turnToOffline", turnToOffline)
	http.HandleFunc("/sendPhoto",sendPhoto)
	http.HandleFunc("/autoLogin",autoLogin)
	http.HandleFunc("/adminLogin",adminLogin)
	http.HandleFunc("/adminLoginCheck",adminLoginCheck)
	http.HandleFunc("/adminGetMan",adminGetMan)
	http.HandleFunc("/adminChangeManMessage",adminChangeManMessage)
	http.HandleFunc("/adminCreateUser",adminCreateUser)
	http.HandleFunc("/adminDeleteUser",adminDeleteUser)

	_ = service.ListenAndServe()
}