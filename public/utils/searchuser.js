const user = document.querySelector("form.su");
const ip = document.querySelector("input.su");

user.addEventListener('submit',(e)=>{
	e.preventDefault();
    const val = ip.value;
	fetch("/finduser/?searchuser="+val).then((res)=>{
		res.json().then((data)=>{
			if(data.noMatch)
			{
				console.log(data.noMatch);
				document.querySelector("#searcheduser").textContent=data.noMatch;	
			} else{
				console.log(data.users);
				for(var i=0;i<data.users.length;i++)
				{
					$("div.searcheduser").append("<li>" + data.users[i] + "</li>");
				}
			}
		})
	})
})

// 	const user = document.querySelector("form.su");
// 	const ip = document.querySelector("input.su");

// user.addEventListener('submit',(e)=>{
// 	e.preventDefault();
//     const val = ip.value;
// 	fetch("/finduser/?searchuser="+val).then((res)=>{
// 		res.json().then((data)=>{
// 			if(data.noMatch)
// 			{
// 				console.log(data.noMatch);
// 				document.querySelector("#searcheduser").textContent=data.noMatch;	
// 			} else{
// 				console.log(data.users);
// 				for(var i=0;i<data.users.length;i++)
// 				{
// 					$("div.searcheduser").append("<li>" + data.users[i] + "</li>");
// 				}
// 			}
// 		})
// 	})
// })