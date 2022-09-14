function delay2(x,doSucceed) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (doSucceed) 
            { resolve(x); } 
        else 
            { reject('reject in delay2') }

      }, 500);
    });
  }


async function aw1(doSucceed) {
    //try
    //{
        //throw new Error('throw in aw1')

        const doReturn = await delay2(10,doSucceed) 
            /*.then(result => 
            console.log('await.then', result)
            )
            .catch( err => 
                console.log('await.catch', err)
            );*/

        //return doReturn; //?
    //}
    //catch(err) {
    //    console.log('aw1.try_cought',err)
    //    return -1
    //}
}

const val = aw1(false)
.then( res => console.log('result', res) )
.catch( err => console.log('val.catch', err))

console.log('value', val)
