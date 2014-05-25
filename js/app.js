(function(){
	Parse.initialize("LuPNkO4hWoaAteIcJIby514gnjhQ2qYmIYEWLFoA",
		"W0SMJY3XaZtJsa02Nl64DG5FBP0kIcdrzGj3qwO1");

	var templates = {};
	["loginView","evaluationView","updateSuccessView"].forEach(function(t){
		var dom = document.getElementById(t);
		templates[t] = doT.template(dom.text);
	});


	var handlers = {
		navbar: function(){
			var currentUser = Parse.User.current();
			if (currentUser){
      			//if loged in      
      			document.getElementById("loginButton").style.display="none";
				document.getElementById("logoutButton").style.display="block";
				document.getElementById("evaluationButton").style.display="block";
      		} else {
      			// Or anonymous user can see.
      			document.getElementById("loginButton").style.display="block";
				document.getElementById("logoutButton").style.display="none";
				document.getElementById("evaluationButton").style.display="none";
      		}
      		//按下登出按鈕後 , 回到login頁面
      		document.getElementById("logoutButton").addEventListener("click",function(){
      			Parse.User.logOut();
      			handlers.navbar();
      			window.location.hash = 'login/';
      		});
      	},
      	loginView: function(){
      		var currentUser = Parse.User.current();
      		
      		//從TAHelp確定是否為本班學生
      		var check_stu=function(id){
				var value = document.getElementById(id).value;  //取input的值
				return TAHelp.getMemberlistOf(value)===false?false:true;
			};

      		if (currentUser) {
      			window.location.hash = 'peer-evaluation/';
      		} else {
        		// Signin Function binding, provided by Parse SDK. 
        		//印出登入+註冊版型();
        		document.getElementById("content").innerHTML=templates.loginView();

        		//綁定登入按鈕觸發事件(); 
        		document.getElementById("form-signin-student-id").addEventListener("keyup",function(){
        			if(!check_stu("form-signin-student-id")){
        				document.getElementById("form-signin-message").innerHTML="The student is not one of the class students.";
						document.getElementById("form-signin-message").style.display="block";
					}
					else{
						document.getElementById("form-signin-message").style.display="none";
					}
        		});
        		document.getElementById("form-signin").addEventListener("submit",function(){
        			if(!check_stu("form-signin-student-id")){
        				alert("The student is not one of the class students.");
        				return false;
        			}

        			Parse.User.logIn(document.getElementById("form-signin-student-id").value,
        				document.getElementById("form-signin-password").value, {
        					success:function(user){
        						handlers.navbar();
      							window.location.hash = 'peer-evaluation/';
        					},error:function(user, error){
        						document.getElementById("form-signin-message").innerHTML="Invaild username or password.";
        						document.getElementById("form-signin-message").style.display="block";
        					}
        			})
        		},false);


        		// Signup Form Password Match Check Binding.
        		// 綁定兩次密碼一致與否檢查事件();
        		document.getElementById("form-signup-password1").addEventListener('keyup', function(){
        			// 動態抓密碼欄的值 (Why?)
        			var singupForm_password=document.getElementById("form-signup-password");
        			var message = (this.value !== singupForm_password.value) ? "Passwords don't match." : '';
        			if(message === ''){
        				document.getElementById("form-signup-message").style.display="none";
        			}
        			else{
        				document.getElementById('form-signup-message').innerHTML = message;
        			}
        		});
        
        		// Signup Function binding, provided by Parse SDK.
        		//綁定註冊按鈕觸發事件();
        		document.getElementById("form-signup-student-id").addEventListener("keyup",function(){
        			if(!check_stu("form-signup-student-id")){
        				document.getElementById("form-signup-message").innerHTML="The student is not one of the class students.";
						document.getElementById("form-signup-message").style.display="block";
					}
					else{
						document.getElementById("form-signup-message").style.display="none";
					}
        		});
        		//document.getElementById("form-signup-password1").addEventListener("keyup",o);
        		document.getElementById("form-signup").addEventListener("submit",function(){
        			if(!check_stu("form-signup-student-id")){
        				alert("The student is not one of the class students.");
        				return false;
        			}

        			var user=new Parse.User();
        			user.set("username",document.getElementById("form-signup-student-id").value);
        			user.set("password",document.getElementById("form-signup-password").value);
        			user.set("email",document.getElementById("form-signup-email").value);
        			
        			user.signUp(null,{
        				success:function(user){
        					handlers.navbar();
      						window.location.hash = 'peer-evaluation/';
        				},error:function(user, error){
        					console.log(error);
        					document.getElementById("form-signup-message").innerHTML=error.message;
							document.getElementById("form-signup-message").style.display="block";
        				}
        			});
        		},false);
        	} 
        },
		evaluationView:function(){
			var eva=Parse.Object.extend("Evaluation");  // 取得Parse的Evaluation class
			var currentUser=Parse.User.current();
			
			//設定ACL
			var r=new Parse.ACL();  
			r.setPublicReadAccess(false);
			r.setPublicWriteAccess(false);
			r.setReadAccess(currentUser,true);
			r.setWriteAccess(currentUser,true);

			var i=new Parse.Query(eva); // 創建一個找查Evaluation的Query物件
			i.equalTo("user",currentUser);
			i.first(
				{success:function(i){
					window.EVAL=i;
					if(i===undefined){   //若此人還沒評分,找到同組人並排除自己
						var s=TAHelp.getMemberlistOf(currentUser.get("username")).filter(function(e){
							return e.StudentId!==currentUser.get("username")?true:false;
						}).map(function(e){
							e.scores=["0","0","0","0"];
							return e;
						})
					}else{  //此人已評分,取出evaluations
						var s=i.toJSON().evaluations;
					}
					//在HTML顯示評分表
					document.getElementById("content").innerHTML=templates.evaluationView(s);
					document.getElementById("evaluationForm-submit").value = i===undefined?"送出表單":"修改表單";
					//submit按鈕觸發事件();
					document.getElementById("evaluationForm").addEventListener("submit",function(){
						for(var k=0 ; k<s.length ; k++){
							for(var j=0 ; j<s[k].scores.length ; j++){
								var a=document.getElementById("stu"+s[k].StudentId+"-q"+j);
								var f=a.options[a.selectedIndex].value;
								s[k].scores[j] = f;
							}
						}
						//第一次評分
						if(i===undefined){
							i=new eva;
							i.set("user",currentUser);
							i.setACL(r); // 附加到物件實體(instance)上
						}
						console.log(s);
						i.set("evaluations",s);
						i.save(null,
							{success:function(){
								//save完切換到提交成功的頁面
								document.getElementById("content").innerHTML=templates.updateSuccessView();
							},error:function(){}});
					},false)
				},
				error:function(e,t){}
			})
		}
	};

	var App = Parse.Router.extend({
		routes:{
			'': 				'index',
			'peer-evaluation/': 'evaluationView',
			'login/': 			'loginView'
		},
		index: function(){
			window.location.hash = 'login/';
		},
		evaluationView: handlers.evaluationView,
		loginView: 		handlers.loginView
	});

	// Initialize the App
	this.Router=new App();
	Parse.history.start();
	handlers.navbar();

})();