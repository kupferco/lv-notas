# Company registration using the API
curl -X POST http://localhost:3000/api/nfse/certificate \
  -F "therapistId=3" \
  -F "password=k81AoDZR" \
  -F "certificate=@11de2409306b6930.pfx"

curl -X POST http://localhost:3000/api/nfse/certificate \
  -F "therapistId=3" \
  -F "password=<pass>" \
  -F "certificate=@11de2409306b6930.pfx"


# Let's use a free API to get the company data
curl -X GET "https://receitaws.com.br/v1/cnpj/04479058000110"

# Busca manual CCM
https://ccm.prefeitura.sp.gov.br/login/contribuinte?tipo=F


# Token principal produção
8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW

# Token Produção
ztkAmNj1QBXZ3epUJ2vfYY2ndQ8BIHb5

# Token Homologação
YkmBG44lZGoAgqMjcAREkHnYGRdqKby0


# Create/updated in production environment FOR REAL
curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW:" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @empresa_lugar_vida.json \
  "https://api.focusnfe.com.br/v2/empresas"


# Test Create in production environment (real) USING DRY RUN (?dry_run=1)
curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW:" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @empresa_lugar_vida.json \
  "https://api.focusnfe.com.br/v2/empresas?dry_run=1"


# Create NFSe in homologação
curl -u "GDUJI3NlePeUOJGgreBmks35qypu2f80:" \
  -X POST \
  -H "Content-Type: application/json" \
  -d @nfse_test.json \
  "https://homologacao.focusnfe.com.br/v2/nfse?ref=TESTE001&empresa_id=150395"

# Check NFSe status
curl -u "GDUJI3NlePeUOJGgreBmks35qypu2f80:" \
  "https://homologacao.focusnfe.com.br/v2/nfse/TESTE001"

# Retrieve company's tokens
curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW:" \
  "https://api.focusnfe.com.br/v2/empresas?cnpj=04479058000110"

# (or)
curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW:" \
  "https://api.focusnfe.com.br/v2/empresas/149459"


# Enable nfse (not needed if already enabled on the initial json)
curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW:" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"habilita_nfse": true}' \
  "https://api.focusnfe.com.br/v2/empresas/149459"



# Update (not needed actually, can just call same method as create)
  curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW" \
  -X PUT \ 
  -H "Content-Type: application/json" \
  -d @empresa_lugar_vida.json \
  "https://api.focusnfe.com.br/v2/empresas/149459"


  # Convert .pfx to base64
base64 -i certificado.pfx -o certificado_base64.txt

# Or in one line for direct use
cat certificado.pfx | base64



!!!!!!!!!!!!!!! THIS WORKS !!!!!!!!!!!!!!!!!

curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW" \
  https://api.focusnfe.com.br/v2/empresas


  https://loja.serpro.gov.br/certificacao

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!




## gcloud curl test commands

# Create a job that can run curl with your master token
gcloud run jobs create test-focus-auth --image=curlimages/curl --region=us-central1

# Test the exact curl command that works locally
gcloud run jobs execute test-focus-auth --region=us-central1 \
  --args='curl,-u,8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW,-v,https://api.focusnfe.com.br/v2/empresas?cnpj=04479058000110'







curl -v -X POST "https://homologacao.focusnfe.com.br/v2/nfse?ref=test123" \
  -H "Authorization: Basic YkmBG44lZGoAgqMjcAREkHnYGRdqKby0" \
  -F "dados=@invoice.json" \
  -F "certificado=@11de2409306b6930.pfx" \
  -F "senha_certificado=k81AoDZR"



  curl -u "YkmBG44lZGoAgqMjcAREkHnYGRdqKby0:" \
  https://homologacao.focusnfe.com.br/v2/nfse/test123



  curl -X POST \
  -H "Content-Type: application/json" \
  -u "YkmBG44lZGoAgqMjcAREkHnYGRdqKby0:" \
  -d '{
    "data_emissao": "2025-01-27T10:00:00-03:00",
    "prestador": {
      "cnpj": "58627456000166",
      "inscricao_municipal": "123456",
      "codigo_municipio": "3550308"
    },
    "servico": {
      "valor_servicos": 100.00,
      "discriminacao": "Serviços de consultoria em tecnologia",
      "item_lista_servico": "1.01",
      "aliquota": 2
    },
    "tomador": {
      "cpf": "29046004856",
      "razao_social": "TESTE HOMOLOGACAO - SEM VALOR FISCAL",
      "endereco": {
        "logradouro": "Rua Teste",
        "numero": "100",
        "codigo_municipio": "3550308",
        "uf": "SP",
        "cep": "01454600"
      }
    }
  }' \
  "https://homologacao.focusnfe.com.br/v2/nfse?ref=UNIQUE_REF_12345"



  # Sandbox
curl -X GET "https://homologacao.focusnfe.com.br/v2/empresas" \
  -H "Authorization: Basic YkmBG44lZGoAgqMjcAREkHnYGRdqKby0" \
  -H "Content-Type: application/json" \
  -v

# Production (if you have a production token)
curl -X GET "https://api.focusnfe.com.br/v2/empresas" \
  -H "Authorization: Basic enRrQW1OajFRQlhaM2VwVUoydmZZWTJuZFE4QklIYjU=" \
  -H "Content-Type: application/json" \
  -v

curl -X GET "https://api.focusnfe.com.br/v2/empresas" \
  -H "Authorization: Basic $(echo -n 'ztkAmNj1QBXZ3epUJ2vfYY2ndQ8BIHb5' | base64)" \
  -H "Content-Type: application/json" \
  -v


echo -n 'ztkAmNj1QBXZ3epUJ2vfYY2ndQ8BIHb5' | base64

curl -X GET "https://api.focusnfe.com.br/v2/empresas" \
  -H "Authorization: Basic $(echo -n 'ztkAmNj1QBXZ3epUJ2vfYY2ndQ8BIHb5' | base64)" \
  -H "Content-Type: application/json" \
  -v




!!!!!!!!!!!!!!! THIS WORKS !!!!!!!!!!!!!!!!!

curl -u "8JM5vtFKbSe2iohvY7eXsdAXrYsMjOLW" \
  https://api.focusnfe.com.br/v2/empresas


  https://loja.serpro.gov.br/certificacao

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!



  curl -u "enRrQW1OajFRQlhaM2VwVUoydmZZWTJuZFE4QklIYjU=" \
  https://api.focusnfe.com.br/v2/empresas






  dankupfer@Dans-MacBook-Pro db % curl -X GET "https://homologacao.focusnfe.com.br/v2/empresas" \
  -H "Authorization: Basic homologacao_token" \
  -H "Content-Type: application/json" \
  -v
Note: Unnecessary use of -X or --request, GET is already inferred.
* Host homologacao.focusnfe.com.br:443 was resolved.
* IPv6: (none)
* IPv4: 18.231.14.64, 54.94.202.38, 18.229.25.136
*   Trying 18.231.14.64:443...
* Connected to homologacao.focusnfe.com.br (18.231.14.64) port 443
* ALPN: curl offers h2,http/1.1
* (304) (OUT), TLS handshake, Client hello (1):
*  CAfile: /etc/ssl/cert.pem
*  CApath: none
* (304) (IN), TLS handshake, Server hello (2):
* (304) (IN), TLS handshake, Unknown (8):
* (304) (IN), TLS handshake, Certificate (11):
* (304) (IN), TLS handshake, CERT verify (15):
* (304) (IN), TLS handshake, Finished (20):
* (304) (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / AEAD-AES128-GCM-SHA256 / [blank] / UNDEF
* ALPN: server accepted h2
* Server certificate:
*  subject: CN=*.acras.com.br
*  start date: Aug  2 00:00:00 2025 GMT
*  expire date: Aug 29 23:59:59 2026 GMT
*  subjectAltName: host "homologacao.focusnfe.com.br" matched cert's "*.focusnfe.com.br"
*  issuer: C=US; O=Amazon; CN=Amazon RSA 2048 M03
*  SSL certificate verify ok.
* using HTTP/2
* [HTTP/2] [1] OPENED stream for https://homologacao.focusnfe.com.br/v2/empresas
* [HTTP/2] [1] [:method: GET]
* [HTTP/2] [1] [:scheme: https]
* [HTTP/2] [1] [:authority: homologacao.focusnfe.com.br]
* [HTTP/2] [1] [:path: /v2/empresas]
* [HTTP/2] [1] [user-agent: curl/8.7.1]
* [HTTP/2] [1] [accept: */*]
* [HTTP/2] [1] [authorization: Basic homologacao_token]
* [HTTP/2] [1] [content-type: application/json]
> GET /v2/empresas HTTP/2
> Host: homologacao.focusnfe.com.br
> User-Agent: curl/8.7.1
> Accept: */*
> Authorization: Basic homologacao_token
> Content-Type: application/json
> 
* Request completely sent off
< HTTP/2 404 
< date: Wed, 27 Aug 2025 09:52:25 GMT
< content-type: text/html; charset=utf-8
< content-length: 145
< x-request-id: 8e2dcf1d-9f21-436b-adf2-93609fc51ba6
< x-runtime: 0.026386
< 
{
  "codigo": "nao_encontrado",
  "mensagem": "Endpoint não encontrado, verifique a documentação desta API em https://focusnfe.com.br/doc/"
}
* Connection #0 to host homologacao.focusnfe.com.br left intact
dankupfer@Dans-MacBook-Pro db % curl -X GET "https://api.focusnfe.com.br/v2/empresas" \
  -H "Authorization: Basic prod_token" \
  -H "Content-Type: application/json" \
  -v
Note: Unnecessary use of -X or --request, GET is already inferred.
* Host api.focusnfe.com.br:443 was resolved.
* IPv6: (none)
* IPv4: 18.229.25.136, 54.94.202.38, 18.231.14.64
*   Trying 18.229.25.136:443...
* Connected to api.focusnfe.com.br (18.229.25.136) port 443
* ALPN: curl offers h2,http/1.1
* (304) (OUT), TLS handshake, Client hello (1):
*  CAfile: /etc/ssl/cert.pem
*  CApath: none
* (304) (IN), TLS handshake, Server hello (2):
* (304) (IN), TLS handshake, Unknown (8):
* (304) (IN), TLS handshake, Certificate (11):
* (304) (IN), TLS handshake, CERT verify (15):
* (304) (IN), TLS handshake, Finished (20):
* (304) (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / AEAD-AES128-GCM-SHA256 / [blank] / UNDEF
* ALPN: server accepted h2
* Server certificate:
*  subject: CN=*.acras.com.br
*  start date: Aug  2 00:00:00 2025 GMT
*  expire date: Aug 29 23:59:59 2026 GMT
*  subjectAltName: host "api.focusnfe.com.br" matched cert's "*.focusnfe.com.br"
*  issuer: C=US; O=Amazon; CN=Amazon RSA 2048 M03
*  SSL certificate verify ok.
* using HTTP/2
* [HTTP/2] [1] OPENED stream for https://api.focusnfe.com.br/v2/empresas
* [HTTP/2] [1] [:method: GET]
* [HTTP/2] [1] [:scheme: https]
* [HTTP/2] [1] [:authority: api.focusnfe.com.br]
* [HTTP/2] [1] [:path: /v2/empresas]
* [HTTP/2] [1] [user-agent: curl/8.7.1]
* [HTTP/2] [1] [accept: */*]
* [HTTP/2] [1] [authorization: Basic prod_token]
* [HTTP/2] [1] [content-type: application/json]
> GET /v2/empresas HTTP/2
> Host: api.focusnfe.com.br
> User-Agent: curl/8.7.1
> Accept: */*
> Authorization: Basic prod_token
> Content-Type: application/json
> 
* Request completely sent off
< HTTP/2 401 
< date: Wed, 27 Aug 2025 09:52:42 GMT
< content-type: text/html; charset=utf-8
< x-frame-options: SAMEORIGIN
< x-xss-protection: 1; mode=block
< x-content-type-options: nosniff
< x-download-options: noopen
< x-permitted-cross-domain-policies: none
< referrer-policy: strict-origin-when-cross-origin
< www-authenticate: Basic realm="Focus NFe"
< cache-control: no-cache
< x-request-id: 891d173f-97d7-473b-a767-b450a1169adb
< x-runtime: 0.035916
< vary: Origin
< 
HTTP Basic: Access denied.
* Connection #0 to host api.focusnfe.com.br left intact
dankupfer@Dans-MacBook-Pro db % 