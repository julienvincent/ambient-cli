import Table from 'cli-table'

const getLogger = labels => {
    return (...data) => {
        const table = new Table({
            chars: {
                'top': '',
                'top-mid': '',
                'top-left': '',
                'top-right': '',
                'bottom': '─',
                'bottom-mid': '─',
                'bottom-left': '─',
                'bottom-right': '─',
                'left': '',
                'left-mid': '─',
                'mid': '─',
                'mid-mid': '─',
                'right': '',
                'right-mid': '─',
                'middle': ''
            },

            head: labels
        })


        table.push(...data)
        console.log(table.toString())
    }
}
export default getLogger