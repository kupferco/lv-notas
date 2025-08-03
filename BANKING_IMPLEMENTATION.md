dankupfer@Dans-MacBook-Pro lv-notas % curl --request POST \
     --url https://api.pluggy.ai/auth \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
  "clientId": "d3693411-ee10-4329-9a79-34c89a8b3b55",
  "clientSecret": "e7a676fa-25b0-4908-8cd9-d79354d7e482"
}
'



{
  "apiKey": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjoiMDhmYmY2ZWM0YTg2ODU0YTAxMDBjMWNhOGM5OTZlMzI6MTA2MTQ2YWEyYjc0MGY5YjNiOGJjOGRlYjAxMTFjNjY1MGMxNWQ0Mjg4MmU3NWVjNDA5NTlkZDczMjYwYWY3ZTU0YjczYzk3N2I5Mjc3Y2MxNjFhZGRkZWNkODVhNjQ0MGE1MjAyNDcyNGFlOTYyYWU4ZGQ0OWNjYjE4NzczNWRlOGRlOWRjODM4ZTYxNjg1M2U5ZmY1ZjNkN2RmMTRiMSIsImlhdCI6MTc1NDA3MTgwOSwiZXhwIjoxNzU0MDc5MDA5fQ.V7rpSE-4SI5FnmGMBG_zn0CH9Uy-TIOFvR3v658lZcVi_kGXxFjGtp5zcdAYU9-U8J3e0fFOCAg0qsB78MC3pqB1BhHV6DR04AxC1JTQbQgsuNS5I8E15rwO8lS1SNU5twT1XWYn-0qkZXu4nZeXDqB0RmH0dMFBcetsoyxAvMyqQRKvblGr34LWsteMSg28MzvjHIOdyl_NZeC67j2888JpsxGEVD0xW-9oNyCjZntmL8r02zj5soGgKbhwgXzjXPJ6PEePw0lvsLyt9t65Gh0kDzJT5Nf3w69URb-SMtCTYtNXyFMfBgBK1yIuLsCAGgK5Of0S7RujtbwMWEpfeA"
}

{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6ImQzNjkzNDExLWVlMTAtNDMyOS05YTc5LTM0Yzg5YThiM2I1NSIsImRhdGEiOiIzZmRlYzEyYzYwMTQ4MmRhZjQ4NGZiM2JiMTQxOGM5NTo0MzdiM2VmODU1MmJiYzNmYjA0ZTY1MmMyZTg5OTBjOGUzZjEzNjQyMWM1ZjEwZmI4ZTc5MzhiY2ExMzlmY2YwMDUzMTE2ZjhhNWY5YjZjMDAzMmEzZjI5NDNlM2EzYWJmMjQxNDAzNzMwNjA1YWE5MmRjYWNkMDkyZGNhYzVhY2FlNjAwM2Y5ZDEwMTU5M2ZhZWE3OTUyOWU4ZjRiMDFlMDg4OWY5YWZkYWM1YmI3ZjkxNDU0OTcwOWJkZTkzYWY5OTgwM2U0YjZkYzVlZjdiMTM1NjI4ODg2Y2NjZjk2NzQ5NGFjZmViN2VkMTY5MjMyMjI2NjBjMGZmOTQ2NjljIiwiaWF0IjoxNzU0MDcyNzgyLCJleHAiOjE3NTQwNzQ1ODJ9.m_kq0_o8bztlDDnDw_XzpFi8VXxs7cnxFPGE680Jay7Rk2p4pUxrn1i1wtUQgnyQIA5hxgIbB4_3VUtzfiQvs3X-fU96olKSsgrjryVRGRW3W_7Qry0RLXIDf9omHajFEhJPmnT1LuCmofgST8IjiwJRAnz-gTTw-1xaf-LlBSShm0-wGF47_79tJw6aN4y65g4HQgF-d9quIIIjj6eAaNMHdUPA4i4hkCa4sN12QGgMcz4K1S3bXq1XlsSHQb7NIOM2S_rnMRW9ecgS_8OneJ4MNkwyAv2EjNtB61GqcXrWbOjLxHeCHPnw896EMdwvo-XFCvJxK9kuVMr2BcWizA"
}





dankupfer@Dans-MacBook-Pro clinic-api % curl -X POST https://api.sandbox.pluggy.ai/auth \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "d3693411-ee10-4329-9a79-34c89a8b3b55",
    "client_secret": "e7a67"
  }'
curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to api.sandbox.pluggy.ai:443 
dankupfer@Dans-MacBook-Pro clinic-api % curl -X POST https://api.pluggy.ai/auth \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "d3693411-ee10-4329-9a79-34c89a8b3b55",
    "client_secret": "e7a67"
  }'
{"message":"clientId must be a UUID,clientId must be a string, clientSecret must be a string","code":400,"errorId":"c271bf87-63c1-47fb-9179-c596a2d9a9b7"}%   
dankupfer@Dans-MacBook-Pro clinic-api %



curl --request POST \
     --url https://api.pluggy.ai/connect_token \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
  "options": {
    "oauthRedirectUri": "https://your-own-url.com"
  }
}
'



curl --request POST \
     --url https://api.pluggy.ai/connect_token \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '
{
  "options": {
    "clientUserId": "d3693411-ee10-4329-9a79-34c89a8b3b55",
    "oauthRedirectUri": "https://3c349d6f41fc.ngrok-free.app"
  }
}
'



curl --request POST \
     --url https://api.pluggy.ai/items \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --header 'Authorization: Bearer your-api-key' \
     --data '
{
  "connectorId": 600,
  "parameters": {
    "username": "d3693411-ee10-4329-9a79-34c89a8b3b55",
    "password": "e7a676fa-25b0-4908-8cd9-d79354d7e482"
  },
   "oauthRedirectUri": "https://3c349d6f41fc.ngrok-free.app"
}
'