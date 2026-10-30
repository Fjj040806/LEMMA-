"""Optional authoring QA: pip install sympy; node --import tsx --input-type=module -e
\"import {items} from './src/content/items.ts';console.log(JSON.stringify(items))\" > items-qa.json
python tests/verify-math.py items-qa.json
"""
import json,sys,sympy as s
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,convert_xor
x=s.Symbol('x',positive=True)
tr=standard_transformations+(implicit_multiplication_application,convert_xor)
def p(v):return parse_expr(v,local_dict={'x':x,'e':s.E,'ln':s.log},transformations=tr)
fns={'example':x*s.exp(2*x),'xe':x*s.exp(x),'xcos':x*s.cos(x),'log':s.log(x),'x2e':x*x*s.exp(x),'check-sin':x*s.sin(x),'check-xlog':x*s.log(x),'check-recip':s.log(x)/x**2}
n=0
for item in json.load(open(sys.argv[1])):
 for a in item['acceptedForms']:
  assert s.simplify(s.diff(p(a),x)-fns[item['id']])==0,(item['id'],a)
  n+=1
 f=item['fields'];assert s.simplify(s.diff(p(f['u'][0]),x)-p(f['du'][0]))==0
 assert s.simplify(s.diff(p(f['v'][0]),x)-p(f['dv'][0]))==0
 assert s.simplify(p(f['u'][0])*p(f['dv'][0])-fns[item['id']])==0
 assert s.simplify(p(f['u'][0])*p(f['v'][0])-p(f['relation'][0]))==0
 assert s.simplify(p(f['v'][0])*p(f['du'][0])-p(f['relation'][1]))==0
print(f'Exact symbolic QA: {n} antiderivative forms and all 8 setups, derivatives, products verified.')
