import camelot
from PyPDF2 import PdfFileReader
import sys
import os
#from pprint import pprint

filePath = sys.argv[1]
whereToSave = sys.argv[2]
fileName = sys.argv[3]
if(fileName[len(fileName) - 5:] == '.docx'):
    os.system("soffice --headless --convert-to pdf --outdir " + "uploaded/tempPdf " +filePath)
    filePath = os.getcwd() +"\\uploaded\\tempPdf\\" + fileName[:len(fileName) - 5] + ".pdf"
def walk(obj, fnt, emb):
    '''
    If there is a key called 'BaseFont', that is a font that is used in the document.
    If there is a key called 'FontName' and another key in the same dictionary object
    that is called 'FontFilex' (where x is null, 2, or 3), then that fontname is 
    embedded.
    
    We create and add to two sets, fnt = fonts used and emb = fonts embedded.
    '''
    if not hasattr(obj, 'keys'):
        return None, None
    fontkeys = set(['/FontFile', '/FontFile2', '/FontFile3'])
    if '/BaseFont' in obj:
        fnt.add(obj['/BaseFont'])
    if '/FontName' in obj:
        if [x for x in fontkeys if x in obj]:# test to see if there is FontFile
            emb.add(obj['/FontName'])

    for k in obj.keys():
        walk(obj[k], fnt, emb)

    return fnt, emb# return the sets for each page

if __name__ == '__main__':
    #finding no of tables in the pdf
    table = camelot.read_pdf(filePath)
    noOfTable = len(table)

    #finding the fonts used in the pdf

    fname = filePath
    pdf = PdfFileReader(fname)
    fonts = set()
    embedded = set()
    for page in pdf.pages:
        obj = page.getObject()
        #print(obj['/Resources'])
        f, e = walk(obj['/Resources'], fonts, embedded)
        fonts = fonts.union(f)
        embedded = embedded.union(e)

    unembedded = fonts - embedded
    #print("Font List")
    fontList = [v[v.find('+',0,len(v)) + 1 :].strip('/') for v in fonts]
    #pprint(sorted(list(fonts)))
    """
    if unembedded:
        print("\nUnembedded Fonts")
        pprint(unembedded)
    """
    fontList = ",".join(list(set(fontList)))
    #print(noOfTable, fontList)

    #finding no of images in the pdf
    #print(os.getcwd())
    
    #at first change pwd
    #print(sys.argv[1])
    #print(sys.argv[2])
    
    os.system('pdfimages.exe '+filePath+' '+whereToSave)
    noOfImages = len([name for name in os.listdir(whereToSave.strip('/temp')) if os.path.isfile(os.path.join(whereToSave.strip('/temp'), name))])
    print(noOfTable, fontList,noOfImages)